require('events').EventEmitter.defaultMaxListeners = 100;
const { logger } = require('@librechat/data-schemas');
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { getBufferString, HumanMessage } = require('@langchain/core/messages');
const {
  sendEvent,
  createRun,
  Tokenizer,
  checkAccess,
  memoryInstructions,
  formatContentStrings,
  createMemoryProcessor,
} = require('@librechat/api');
const {
  Callback,
  Providers,
  GraphEvents,
  formatMessage,
  formatAgentMessages,
  getTokenCountForMessage,
  createMetadataAggregator,
} = require('@librechat/agents');
const {
  Constants,
  Permissions,
  VisionModes,
  ContentTypes,
  EModelEndpoint,
  PermissionTypes,
  isAgentsEndpoint,
  AgentCapabilities,
  bedrockInputSchema,
  removeNullishValues,
} = require('librechat-data-provider');
const {
  findPluginAuthsByKeys,
  getFormattedMemories,
  deleteMemory,
  setMemory,
} = require('~/models');
const { getMCPAuthMap, checkCapability, hasCustomUserVars } = require('~/server/services/Config');
const { addCacheControl, createContextHandlers } = require('~/app/clients/prompts');
const { initializeAgent } = require('~/server/services/Endpoints/agents/agent');
const { spendTokens, spendStructuredTokens } = require('~/models/spendTokens');
const { encodeAndFormat } = require('~/server/services/Files/images/encode');
const { getProviderConfig } = require('~/server/services/Endpoints');
const BaseClient = require('~/app/clients/BaseClient');
const { getRoleByName } = require('~/models/Role');
const { loadAgent } = require('~/models/Agent');
const { getMCPManager } = require('~/config');

const omitTitleOptions = new Set([
  'stream',
  'thinking',
  'streaming',
  'clientOptions',
  'thinkingConfig',
  'thinkingBudget',
  'includeThoughts',
  'maxOutputTokens',
  'additionalModelRequestFields',
]);

/**
 * @param {ServerRequest} req
 * @param {Agent} agent
 * @param {string} endpoint
 */
const payloadParser = ({ req, agent, endpoint }) => {
  if (isAgentsEndpoint(endpoint)) {
    return { model: undefined };
  } else if (endpoint === EModelEndpoint.bedrock) {
    return bedrockInputSchema.parse(agent.model_parameters);
  }
  return req.body.endpointOption.model_parameters;
};

const noSystemModelRegex = [/\b(o1-preview|o1-mini|amazon\.titan-text)\b/gi];

function createTokenCounter(encoding) {
  return function (message) {
    const countTokens = (text) => Tokenizer.getTokenCount(text, encoding);
    return getTokenCountForMessage(message, countTokens);
  };
}

function logToolError(graph, error, toolId) {
  logger.error(
    '[api/server/controllers/agents/client.js #chatCompletion] Tool Error',
    error,
    toolId,
  );
}

class AgentClient extends BaseClient {
  constructor(options = {}) {
    super(null, options);
    /** The current client class
     * @type {string} */
    this.clientName = EModelEndpoint.agents;

    /** @type {'discard' | 'summarize'} */
    this.contextStrategy = 'discard';

    /** @deprecated @type {true} - Is a Chat Completion Request */
    this.isChatCompletion = true;

    /** @type {AgentRun} */
    this.run;

    const {
      agentConfigs,
      contentParts,
      collectedUsage,
      artifactPromises,
      maxContextTokens,
      ...clientOptions
    } = options;

    this.agentConfigs = agentConfigs;
    this.maxContextTokens = maxContextTokens;
    /** @type {MessageContentComplex[]} */
    this.contentParts = contentParts;
    /** @type {Array<UsageMetadata>} */
    this.collectedUsage = collectedUsage;
    /** @type {ArtifactPromises} */
    this.artifactPromises = artifactPromises;
    console.log('DEBUG: AGENTCLIENT CONSTRUCTOR - Starting with options:', {
      endpoint: options.endpoint,
      agentModel: options.agent?.model_parameters?.model,
      clientOptionsModel: clientOptions?.model,
      clientOptionsEndpoint: clientOptions?.endpoint,
      hasActualClient: !!options.client,
      actualClientType: options.client?.constructor?.name
    });

    /** @type {AgentClientOptions} */
    this.options = Object.assign({ endpoint: options.endpoint }, clientOptions);
    
    console.log('DEBUG: CONSTRUCTOR - Agent client options:', {
      endpoint: options.endpoint,
      agentModel: this.options.agent?.model_parameters?.model,
      clientOptionsModel: clientOptions.model,
      endpointOptionModel: clientOptions.endpointOption?.model_parameters?.model
    });
    
    /** @type {string} */
    // Fix: Safely access model_parameters.model to avoid undefined.match error
    this.model = this.options.agent?.model_parameters?.model;
    
    // Fix: If agent model is undefined, try to get it from other sources
    if (!this.model) {
      this.model = clientOptions.model || 
                   clientOptions.endpointOption?.model_parameters?.model ||
                   clientOptions.modelOptions?.model;
      console.log('DEBUG: CONSTRUCTOR - Model was undefined, set to:', this.model);
      
      // Also update the agent's model_parameters if it exists
      if (this.options.agent && !this.options.agent.model_parameters) {
        this.options.agent.model_parameters = {};
      }
      if (this.options.agent && this.model) {
        this.options.agent.model_parameters.model = this.model;
        console.log('DEBUG: CONSTRUCTOR - Updated agent.model_parameters.model to:', this.model);
      }
    }

    // If there's a custom client provided (like EchoStreamClient), store it
    if (options.client) {
      this.client = options.client;
      console.log('DEBUG: CONSTRUCTOR - Set client to:', this.client.constructor.name);
    }
    /** The key for the usage object's input tokens
     * @type {string} */
    this.inputTokensKey = 'input_tokens';
    /** The key for the usage object's output tokens
     * @type {string} */
    this.outputTokensKey = 'output_tokens';
    /** @type {UsageMetadata} */
    this.usage;
    /** @type {Record<string, number>} */
    this.indexTokenCountMap = {};
    /** @type {(messages: BaseMessage[]) => Promise<void>} */
    this.processMemory;
  }

  /**
   * Returns the aggregated content parts for the current run.
   * @returns {MessageContentComplex[]} */
  getContentParts() {
    return this.contentParts;
  }

  setOptions(options) {
    logger.info('[api/server/controllers/agents/client.js] setOptions', options);
  }

  /**
   * `AgentClient` is not opinionated about vision requests, so we don't do anything here
   * @param {MongoFile[]} attachments
   */
  checkVisionRequest() {}

  getSaveOptions() {
    // TODO:
    // would need to be override settings; otherwise, model needs to be undefined
    // model: this.override.model,
    // instructions: this.override.instructions,
    // additional_instructions: this.override.additional_instructions,
    let runOptions = {};
    try {
      runOptions = payloadParser(this.options);
    } catch (error) {
      logger.error(
        '[api/server/controllers/agents/client.js #getSaveOptions] Error parsing options',
        error,
      );
    }

    return removeNullishValues(
      Object.assign(
        {
          endpoint: this.options.endpoint,
          agent_id: this.options.agent.id,
          modelLabel: this.options.modelLabel,
          maxContextTokens: this.options.maxContextTokens,
          resendFiles: this.options.resendFiles,
          imageDetail: this.options.imageDetail,
          spec: this.options.spec,
          iconURL: this.options.iconURL,
        },
        // TODO: PARSE OPTIONS BY PROVIDER, MAY CONTAIN SENSITIVE DATA
        runOptions,
      ),
    );
  }

  getBuildMessagesOptions() {
    return {
      instructions: this.options.agent.instructions,
      additional_instructions: this.options.agent.additional_instructions,
    };
  }

  /**
   *
   * @param {TMessage} message
   * @param {Array<MongoFile>} attachments
   * @returns {Promise<Array<Partial<MongoFile>>>}
   */
  async addImageURLs(message, attachments) {
    const { files, text, image_urls } = await encodeAndFormat(
      this.options.req,
      attachments,
      this.options.agent.provider,
      VisionModes.agents,
    );
    message.image_urls = image_urls.length ? image_urls : undefined;
    if (text && text.length) {
      message.ocr = text;
    }
    return files;
  }

  async buildMessages(
    messages,
    parentMessageId,
    { instructions = null, additional_instructions = null },
    opts,
  ) {
    let orderedMessages = this.constructor.getMessagesForConversation({
      messages,
      parentMessageId,
      summary: this.shouldSummarize,
    });

    let payload;
    /** @type {number | undefined} */
    let promptTokens;

    /** @type {string} */
    let systemContent = [instructions ?? '', additional_instructions ?? '']
      .filter(Boolean)
      .join('\n')
      .trim();

    if (this.options.attachments) {
      const attachments = await this.options.attachments;

      if (this.message_file_map) {
        this.message_file_map[orderedMessages[orderedMessages.length - 1].messageId] = attachments;
      } else {
        this.message_file_map = {
          [orderedMessages[orderedMessages.length - 1].messageId]: attachments,
        };
      }

      const files = await this.addImageURLs(
        orderedMessages[orderedMessages.length - 1],
        attachments,
      );

      this.options.attachments = files;
    }

    /** Note: Bedrock uses legacy RAG API handling */
    if (this.message_file_map && !isAgentsEndpoint(this.options.endpoint)) {
      this.contextHandlers = createContextHandlers(
        this.options.req,
        orderedMessages[orderedMessages.length - 1].text,
      );
    }

    const formattedMessages = orderedMessages.map((message, i) => {
      const formattedMessage = formatMessage({
        message,
        userName: this.options?.name,
        assistantName: this.options?.modelLabel,
      });

      if (message.ocr && i !== orderedMessages.length - 1) {
        if (typeof formattedMessage.content === 'string') {
          formattedMessage.content = message.ocr + '\n' + formattedMessage.content;
        } else {
          const textPart = formattedMessage.content.find((part) => part.type === 'text');
          textPart
            ? (textPart.text = message.ocr + '\n' + textPart.text)
            : formattedMessage.content.unshift({ type: 'text', text: message.ocr });
        }
      } else if (message.ocr && i === orderedMessages.length - 1) {
        systemContent = [systemContent, message.ocr].join('\n');
      }

      const needsTokenCount =
        (this.contextStrategy && !orderedMessages[i].tokenCount) || message.ocr;

      /* If tokens were never counted, or, is a Vision request and the message has files, count again */
      if (needsTokenCount || (this.isVisionModel && (message.image_urls || message.files))) {
        orderedMessages[i].tokenCount = this.getTokenCountForMessage(formattedMessage);
      }

      /* If message has files, calculate image token cost */
      if (this.message_file_map && this.message_file_map[message.messageId]) {
        const attachments = this.message_file_map[message.messageId];
        for (const file of attachments) {
          if (file.embedded) {
            this.contextHandlers?.processFile(file);
            continue;
          }
          if (file.metadata?.fileIdentifier) {
            continue;
          }
          // orderedMessages[i].tokenCount += this.calculateImageTokenCost({
          //   width: file.width,
          //   height: file.height,
          //   detail: this.options.imageDetail ?? ImageDetail.auto,
          // });
        }
      }

      return formattedMessage;
    });

    if (this.contextHandlers) {
      this.augmentedPrompt = await this.contextHandlers.createContext();
      systemContent = this.augmentedPrompt + systemContent;
    }

    // Inject MCP server instructions if available
    const ephemeralAgent = this.options.req.body.ephemeralAgent;
    let mcpServers = [];

    // Check for ephemeral agent MCP servers
    if (ephemeralAgent && ephemeralAgent.mcp && ephemeralAgent.mcp.length > 0) {
      mcpServers = ephemeralAgent.mcp;
    }
    // Check for regular agent MCP tools
    else if (this.options.agent && this.options.agent.tools) {
      mcpServers = this.options.agent.tools
        .filter(
          (tool) =>
            tool instanceof DynamicStructuredTool && tool.name.includes(Constants.mcp_delimiter),
        )
        .map((tool) => tool.name.split(Constants.mcp_delimiter).pop())
        .filter(Boolean);
    }

    if (mcpServers.length > 0) {
      try {
        const mcpInstructions = getMCPManager().formatInstructionsForContext(mcpServers);
        if (mcpInstructions) {
          systemContent = [systemContent, mcpInstructions].filter(Boolean).join('\n\n');
          logger.debug('[AgentClient] Injected MCP instructions for servers:', mcpServers);
        }
      } catch (error) {
        logger.error('[AgentClient] Failed to inject MCP instructions:', error);
      }
    }

    if (systemContent) {
      this.options.agent.instructions = systemContent;
    }

    /** @type {Record<string, number> | undefined} */
    let tokenCountMap;

    if (this.contextStrategy) {
      ({ payload, promptTokens, tokenCountMap, messages } = await this.handleContextStrategy({
        orderedMessages,
        formattedMessages,
      }));
    }

    for (let i = 0; i < messages.length; i++) {
      this.indexTokenCountMap[i] = messages[i].tokenCount;
    }

    const result = {
      tokenCountMap,
      prompt: payload,
      promptTokens,
      messages,
    };

    if (promptTokens >= 0 && typeof opts?.getReqData === 'function') {
      opts.getReqData({ promptTokens });
    }

    const withoutKeys = await this.useMemory();
    if (withoutKeys) {
      systemContent += `${memoryInstructions}\n\n# Existing memory about the user:\n${withoutKeys}`;
    }

    if (systemContent) {
      this.options.agent.instructions = systemContent;
    }

    return result;
  }

  /**
   * @returns {Promise<string | undefined>}
   */
  async useMemory() {
    const user = this.options.req.user;
    if (user.personalization?.memories === false) {
      return;
    }
    const hasAccess = await checkAccess({
      user,
      permissionType: PermissionTypes.MEMORIES,
      permissions: [Permissions.USE],
      getRoleByName,
    });

    if (!hasAccess) {
      logger.debug(
        `[api/server/controllers/agents/client.js #useMemory] User ${user.id} does not have USE permission for memories`,
      );
      return;
    }
    /** @type {TCustomConfig['memory']} */
    const memoryConfig = this.options.req?.app?.locals?.memory;
    if (!memoryConfig || memoryConfig.disabled === true) {
      return;
    }

    /** @type {Agent} */
    let prelimAgent;
    const allowedProviders = new Set(
      this.options.req?.app?.locals?.[EModelEndpoint.agents]?.allowedProviders,
    );
    try {
      if (memoryConfig.agent?.id != null && memoryConfig.agent.id !== this.options.agent.id) {
        prelimAgent = await loadAgent({
          req: this.options.req,
          agent_id: memoryConfig.agent.id,
          endpoint: EModelEndpoint.agents,
        });
      } else if (
        memoryConfig.agent?.id == null &&
        memoryConfig.agent?.model != null &&
        memoryConfig.agent?.provider != null
      ) {
        prelimAgent = { id: Constants.EPHEMERAL_AGENT_ID, ...memoryConfig.agent };
      }
    } catch (error) {
      logger.error(
        '[api/server/controllers/agents/client.js #useMemory] Error loading agent for memory',
        error,
      );
    }

    const agent = await initializeAgent({
      req: this.options.req,
      res: this.options.res,
      agent: prelimAgent,
      allowedProviders,
      endpointOption: {
        endpoint:
          prelimAgent.id !== Constants.EPHEMERAL_AGENT_ID
            ? EModelEndpoint.agents
            : memoryConfig.agent?.provider,
      },
    });

    if (!agent) {
      logger.warn(
        '[api/server/controllers/agents/client.js #useMemory] No agent found for memory',
        memoryConfig,
      );
      return;
    }

    const llmConfig = Object.assign(
      {
        provider: agent.provider,
        model: agent.model,
      },
      agent.model_parameters,
    );

    /** @type {import('@librechat/api').MemoryConfig} */
    const config = {
      validKeys: memoryConfig.validKeys,
      instructions: agent.instructions,
      llmConfig,
      tokenLimit: memoryConfig.tokenLimit,
    };

    const userId = this.options.req.user.id + '';
    const messageId = this.responseMessageId + '';
    const conversationId = (this.conversationId || 'unknown') + '';
    
    console.log('DEBUG: MEMORY PROCESSOR - conversationId values:', {
      thisConversationId: this.conversationId,
      stringifiedConversationId: conversationId,
      hasConversationId: !!this.conversationId
    });
    const [withoutKeys, processMemory] = await createMemoryProcessor({
      userId,
      config,
      messageId,
      conversationId,
      memoryMethods: {
        setMemory,
        deleteMemory,
        getFormattedMemories,
      },
      res: this.options.res,
    });

    this.processMemory = processMemory;
    return withoutKeys;
  }

  /**
   * @param {BaseMessage[]} messages
   * @returns {Promise<void | (TAttachment | null)[]>}
   */
  async runMemory(messages) {
    try {
      if (this.processMemory == null) {
        return;
      }
      /** @type {TCustomConfig['memory']} */
      const memoryConfig = this.options.req?.app?.locals?.memory;
      const messageWindowSize = memoryConfig?.messageWindowSize ?? 5;

      let messagesToProcess = [...messages];
      if (messages.length > messageWindowSize) {
        for (let i = messages.length - messageWindowSize; i >= 0; i--) {
          const potentialWindow = messages.slice(i, i + messageWindowSize);
          if (potentialWindow[0]?.role === 'user') {
            messagesToProcess = [...potentialWindow];
            break;
          }
        }

        if (messagesToProcess.length === messages.length) {
          messagesToProcess = [...messages.slice(-messageWindowSize)];
        }
      }

      const bufferString = getBufferString(messagesToProcess);
      const bufferMessage = new HumanMessage(`# Current Chat:\n\n${bufferString}`);
      return await this.processMemory([bufferMessage]);
    } catch (error) {
      logger.error('Memory Agent failed to process memory', error);
    }
  }

  /** @type {sendCompletion} */
  async sendCompletion(payload, opts = {}) {
    console.log('DEBUG: SENDCOMPLETION - Starting with:', {
      thisModel: this.model,
      clientType: this.client?.constructor?.name,
      payloadModel: payload?.model,
      hasClient: !!this.client
    });
    
    await this.chatCompletion({
      payload,
      onProgress: opts.onProgress,
      abortController: opts.abortController,
    });
    return this.contentParts;
  }

  /**
   * @param {Object} params
   * @param {string} [params.model]
   * @param {string} [params.context='message']
   * @param {UsageMetadata[]} [params.collectedUsage=this.collectedUsage]
   */
  async recordCollectedUsage({ model, context = 'message', collectedUsage = this.collectedUsage }) {
    if (!collectedUsage || !collectedUsage.length) {
      return;
    }
    const input_tokens =
      (collectedUsage[0]?.input_tokens || 0) +
      (Number(collectedUsage[0]?.input_token_details?.cache_creation) || 0) +
      (Number(collectedUsage[0]?.input_token_details?.cache_read) || 0);

    let output_tokens = 0;
    let previousTokens = input_tokens; // Start with original input
    for (let i = 0; i < collectedUsage.length; i++) {
      const usage = collectedUsage[i];
      if (!usage) {
        continue;
      }

      const cache_creation = Number(usage.input_token_details?.cache_creation) || 0;
      const cache_read = Number(usage.input_token_details?.cache_read) || 0;

      const txMetadata = {
        context,
        conversationId: this.conversationId || 'unknown',
        user: this.user ?? this.options.req.user?.id,
        endpointTokenConfig: this.options.endpointTokenConfig,
        model: usage.model ?? model ?? this.model ?? this.options.agent.model_parameters.model,
      };

      if (i > 0) {
        // Count new tokens generated (input_tokens minus previous accumulated tokens)
        output_tokens +=
          (Number(usage.input_tokens) || 0) + cache_creation + cache_read - previousTokens;
      }

      // Add this message's output tokens
      output_tokens += Number(usage.output_tokens) || 0;

      // Update previousTokens to include this message's output
      previousTokens += Number(usage.output_tokens) || 0;

      if (cache_creation > 0 || cache_read > 0) {
        spendStructuredTokens(txMetadata, {
          promptTokens: {
            input: usage.input_tokens,
            write: cache_creation,
            read: cache_read,
          },
          completionTokens: usage.output_tokens,
        }).catch((err) => {
          logger.error(
            '[api/server/controllers/agents/client.js #recordCollectedUsage] Error spending structured tokens',
            err,
          );
        });
        continue;
      }
      spendTokens(txMetadata, {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
      }).catch((err) => {
        logger.error(
          '[api/server/controllers/agents/client.js #recordCollectedUsage] Error spending tokens',
          err,
        );
      });
    }

    this.usage = {
      input_tokens,
      output_tokens,
    };
  }

  /**
   * Get stream usage as returned by this client's API response.
   * @returns {UsageMetadata} The stream usage object.
   */
  getStreamUsage() {
    return this.usage;
  }

  /**
   * @param {TMessage} responseMessage
   * @returns {number}
   */
  getTokenCountForResponse({ content }) {
    return this.getTokenCountForMessage({
      role: 'assistant',
      content,
    });
  }

  /**
   * Calculates the correct token count for the current user message based on the token count map and API usage.
   * Edge case: If the calculation results in a negative value, it returns the original estimate.
   * If revisiting a conversation with a chat history entirely composed of token estimates,
   * the cumulative token count going forward should become more accurate as the conversation progresses.
   * @param {Object} params - The parameters for the calculation.
   * @param {Record<string, number>} params.tokenCountMap - A map of message IDs to their token counts.
   * @param {string} params.currentMessageId - The ID of the current message to calculate.
   * @param {OpenAIUsageMetadata} params.usage - The usage object returned by the API.
   * @returns {number} The correct token count for the current user message.
   */
  calculateCurrentTokenCount({ tokenCountMap, currentMessageId, usage }) {
    const originalEstimate = tokenCountMap[currentMessageId] || 0;

    if (!usage || typeof usage[this.inputTokensKey] !== 'number') {
      return originalEstimate;
    }

    tokenCountMap[currentMessageId] = 0;
    const totalTokensFromMap = Object.values(tokenCountMap).reduce((sum, count) => {
      const numCount = Number(count);
      return sum + (isNaN(numCount) ? 0 : numCount);
    }, 0);
    const totalInputTokens = usage[this.inputTokensKey] ?? 0;

    const currentMessageTokens = totalInputTokens - totalTokensFromMap;
    return currentMessageTokens > 0 ? currentMessageTokens : originalEstimate;
  }

  async chatCompletion({ payload, abortController = null }) {
    console.log('DEBUG: CHATCOMPLETION - Starting with:', {
      thisModel: this.model,
      clientType: this.client?.constructor?.name,
      payloadModel: payload?.model,
      hasClient: !!this.client
    });
    
    /** @type {Partial<GraphRunnableConfig>} */
    let config;
    /** @type {ReturnType<createRun>} */
    let run;
    /** @type {Promise<(TAttachment | null)[] | undefined>} */
    let memoryPromise;
    try {
      if (!abortController) {
        abortController = new AbortController();
      }

      /** @type {TCustomConfig['endpoints']['agents']} */
      const agentsEConfig = this.options.req.app.locals[EModelEndpoint.agents];

      config = {
        configurable: {
          thread_id: this.conversationId || 'unknown',
          last_agent_index: this.agentConfigs?.size ?? 0,
          user_id: this.user ?? this.options.req.user?.id,
          hide_sequential_outputs: this.options.agent.hide_sequential_outputs,
          user: this.options.req.user,
        },
        recursionLimit: agentsEConfig?.recursionLimit ?? 25,
        signal: abortController.signal,
        streamMode: 'values',
        version: 'v2',
      };

      const toolSet = new Set((this.options.agent.tools ?? []).map((tool) => tool && tool.name));
      let { messages: initialMessages, indexTokenCountMap } = formatAgentMessages(
        payload,
        this.indexTokenCountMap,
        toolSet,
      );

      /**
       *
       * @param {Agent} agent
       * @param {BaseMessage[]} messages
       * @param {number} [i]
       * @param {TMessageContentParts[]} [contentData]
       * @param {Record<string, number>} [currentIndexCountMap]
       */
      const runAgent = async (agent, _messages, i = 0, contentData = [], _currentIndexCountMap) => {
        config.configurable.model = agent.model_parameters.model;
        const currentIndexCountMap = _currentIndexCountMap ?? indexTokenCountMap;
        if (i > 0) {
          this.model = agent.model_parameters.model;
        }
        if (agent.recursion_limit && typeof agent.recursion_limit === 'number') {
          config.recursionLimit = agent.recursion_limit;
        }
        if (
          agentsEConfig?.maxRecursionLimit &&
          config.recursionLimit > agentsEConfig?.maxRecursionLimit
        ) {
          config.recursionLimit = agentsEConfig?.maxRecursionLimit;
        }
        config.configurable.agent_id = agent.id;
        config.configurable.name = agent.name;
        config.configurable.agent_index = i;
        console.log('DEBUG: STEP 1 - Agent model_parameters before fix:', {
          hasModelParams: !!agent.model_parameters,
          model: agent.model_parameters?.model,
          agentId: agent.id,
          agentName: agent.name,
          thisModel: this.model,
          clientType: this.client?.constructor?.name
        });
        
        // Fix for echo_stream models: ensure model is set from this.model if agent.model_parameters.model is undefined
        if (!agent.model_parameters?.model && this.model) {
          console.log('DEBUG: STEP 2 - Setting missing agent model from this.model:', this.model);
          if (!agent.model_parameters) {
            agent.model_parameters = {};
          }
          agent.model_parameters.model = this.model;
          console.log('DEBUG: STEP 3 - Agent model after fix:', agent.model_parameters.model);
        }
        
        console.log('DEBUG: STEP 4 - Final agent model_parameters:', {
          model: agent.model_parameters?.model,
          hasModel: !!agent.model_parameters?.model
        });
        
        const noSystemMessages = noSystemModelRegex.some((regex) =>
          agent.model_parameters?.model?.match(regex),
        );

        const systemMessage = Object.values(agent.toolContextMap ?? {})
          .join('\n')
          .trim();

        let systemContent = [
          systemMessage,
          agent.instructions ?? '',
          i !== 0 ? (agent.additional_instructions ?? '') : '',
        ]
          .join('\n')
          .trim();

        if (noSystemMessages === true) {
          agent.instructions = undefined;
          agent.additional_instructions = undefined;
        } else {
          agent.instructions = systemContent;
          agent.additional_instructions = undefined;
        }

        if (noSystemMessages === true && systemContent?.length) {
          const latestMessageContent = _messages.pop().content;
          if (typeof latestMessage !== 'string') {
            latestMessageContent[0].text = [systemContent, latestMessageContent[0].text].join('\n');
            _messages.push(new HumanMessage({ content: latestMessageContent }));
          } else {
            const text = [systemContent, latestMessageContent].join('\n');
            _messages.push(new HumanMessage(text));
          }
        }

        let messages = _messages;
        if (agent.useLegacyContent === true) {
          messages = formatContentStrings(messages);
        }
        if (
          agent.model_parameters?.clientOptions?.defaultHeaders?.['anthropic-beta']?.includes(
            'prompt-caching',
          )
        ) {
          messages = addCacheControl(messages);
        }

        if (i === 0) {
          memoryPromise = this.runMemory(messages);
        }

        run = await createRun({
          agent,
          req: this.options.req,
          runId: this.responseMessageId,
          signal: abortController.signal,
          customHandlers: this.options.eventHandlers,
        });

        if (!run) {
          throw new Error('Failed to create run');
        }

        if (i === 0) {
          this.run = run;
        }

        if (contentData.length) {
          const agentUpdate = {
            type: ContentTypes.AGENT_UPDATE,
            [ContentTypes.AGENT_UPDATE]: {
              index: contentData.length,
              runId: this.responseMessageId,
              agentId: agent.id,
            },
          };
          const streamData = {
            event: GraphEvents.ON_AGENT_UPDATE,
            data: agentUpdate,
          };
          this.options.aggregateContent(streamData);
          sendEvent(this.options.res, streamData);
          contentData.push(agentUpdate);
          run.Graph.contentData = contentData;
        }

        try {
          if (await hasCustomUserVars()) {
            config.configurable.userMCPAuthMap = await getMCPAuthMap({
              tools: agent.tools,
              userId: this.options.req.user.id,
              findPluginAuthsByKeys,
            });
          }
        } catch (err) {
          logger.error(
            `[api/server/controllers/agents/client.js #chatCompletion] Error getting custom user vars for agent ${agent.id}`,
            err,
          );
        }

        await run.processStream({ messages }, config, {
          keepContent: i !== 0,
          tokenCounter: createTokenCounter(this.getEncoding()),
          indexTokenCountMap: currentIndexCountMap,
          maxContextTokens: agent.maxContextTokens,
          callbacks: {
            [Callback.TOOL_ERROR]: logToolError,
          },
        });

        config.signal = null;
      };

      await runAgent(this.options.agent, initialMessages);
      let finalContentStart = 0;
      if (
        this.agentConfigs &&
        this.agentConfigs.size > 0 &&
        (await checkCapability(this.options.req, AgentCapabilities.chain))
      ) {
        const windowSize = 5;
        let latestMessage = initialMessages.pop().content;
        if (typeof latestMessage !== 'string') {
          latestMessage = latestMessage[0].text;
        }
        let i = 1;
        let runMessages = [];

        const windowIndexCountMap = {};
        const windowMessages = initialMessages.slice(-windowSize);
        let currentIndex = 4;
        for (let i = initialMessages.length - 1; i >= 0; i--) {
          windowIndexCountMap[currentIndex] = indexTokenCountMap[i];
          currentIndex--;
          if (currentIndex < 0) {
            break;
          }
        }
        const encoding = this.getEncoding();
        const tokenCounter = createTokenCounter(encoding);
        for (const [agentId, agent] of this.agentConfigs) {
          if (abortController.signal.aborted === true) {
            break;
          }
          const currentRun = await run;

          if (
            i === this.agentConfigs.size &&
            config.configurable.hide_sequential_outputs === true
          ) {
            const content = this.contentParts.filter(
              (part) => part.type === ContentTypes.TOOL_CALL,
            );

            this.options.res.write(
              `event: message\ndata: ${JSON.stringify({
                event: 'on_content_update',
                data: {
                  runId: this.responseMessageId,
                  content,
                },
              })}\n\n`,
            );
          }
          const _runMessages = currentRun.Graph.getRunMessages();
          finalContentStart = this.contentParts.length;
          runMessages = runMessages.concat(_runMessages);
          const contentData = currentRun.Graph.contentData.slice();
          const bufferString = getBufferString([new HumanMessage(latestMessage), ...runMessages]);
          if (i === this.agentConfigs.size) {
            logger.debug(`SEQUENTIAL AGENTS: Last buffer string:\n${bufferString}`);
          }
          try {
            const contextMessages = [];
            const runIndexCountMap = {};
            for (let i = 0; i < windowMessages.length; i++) {
              const message = windowMessages[i];
              const messageType = message._getType();
              if (
                (!agent.tools || agent.tools.length === 0) &&
                (messageType === 'tool' || (message.tool_calls?.length ?? 0) > 0)
              ) {
                continue;
              }
              runIndexCountMap[contextMessages.length] = windowIndexCountMap[i];
              contextMessages.push(message);
            }
            const bufferMessage = new HumanMessage(bufferString);
            runIndexCountMap[contextMessages.length] = tokenCounter(bufferMessage);
            const currentMessages = [...contextMessages, bufferMessage];
            await runAgent(agent, currentMessages, i, contentData, runIndexCountMap);
          } catch (err) {
            logger.error(
              `[api/server/controllers/agents/client.js #chatCompletion] Error running agent ${agentId} (${i})`,
              err,
            );
          }
          i++;
        }
      }

      /** Note: not implemented */
      if (config.configurable.hide_sequential_outputs !== true) {
        finalContentStart = 0;
      }

      this.contentParts = this.contentParts.filter((part, index) => {
        // Include parts that are either:
        // 1. At or after the finalContentStart index
        // 2. Of type tool_call
        // 3. Have tool_call_ids property
        return (
          index >= finalContentStart || part.type === ContentTypes.TOOL_CALL || part.tool_call_ids
        );
      });

      try {
        if (memoryPromise) {
          const attachments = await memoryPromise;
          if (attachments && attachments.length > 0) {
            this.artifactPromises.push(...attachments);
          }
        }
        await this.recordCollectedUsage({ context: 'message' });
      } catch (err) {
        logger.error(
          '[api/server/controllers/agents/client.js #chatCompletion] Error recording collected usage',
          err,
        );
      }
    } catch (err) {
      if (memoryPromise) {
        const attachments = await memoryPromise;
        if (attachments && attachments.length > 0) {
          this.artifactPromises.push(...attachments);
        }
      }
      logger.error(
        '[api/server/controllers/agents/client.js #sendCompletion] Operation aborted',
        err,
      );
      if (!abortController.signal.aborted) {
        logger.error(
          '[api/server/controllers/agents/client.js #sendCompletion] Unhandled error type',
          err,
        );
        this.contentParts.push({
          type: ContentTypes.ERROR,
          [ContentTypes.ERROR]: `An error occurred while processing the request${err?.message ? `: ${err.message}` : ''}`,
        });
      }
    }
  }

  /**
   *
   * @param {Object} params
   * @param {string} params.text
   * @param {string} params.conversationId
   */
  async titleConvo({ text, abortController }) {
    if (!this.run) {
      throw new Error('Run not initialized');
    }
    const { handleLLMEnd, collected: collectedMetadata } = createMetadataAggregator();
    const { req, res, agent } = this.options;
    const endpoint = agent.endpoint;

    /** @type {import('@librechat/agents').ClientOptions} */
    let clientOptions = {
      maxTokens: 75,
      model: agent.model_parameters.model,
    };

    const { getOptions, overrideProvider, customEndpointConfig } =
      await getProviderConfig(endpoint);

    /** @type {TEndpoint | undefined} */
    const endpointConfig = req.app.locals[endpoint] ?? customEndpointConfig;
    if (!endpointConfig) {
      logger.warn(
        '[api/server/controllers/agents/client.js #titleConvo] Error getting endpoint config',
      );
    }

    if (
      endpointConfig &&
      endpointConfig.titleModel &&
      endpointConfig.titleModel !== Constants.CURRENT_MODEL
    ) {
      clientOptions.model = endpointConfig.titleModel;
    }

    const options = await getOptions({
      req,
      res,
      optionsOnly: true,
      overrideEndpoint: endpoint,
      overrideModel: clientOptions.model,
      endpointOption: { model_parameters: clientOptions },
    });

    let provider = options.provider ?? overrideProvider ?? agent.provider;
    if (
      endpoint === EModelEndpoint.azureOpenAI &&
      options.llmConfig?.azureOpenAIApiInstanceName == null
    ) {
      provider = Providers.OPENAI;
    } else if (
      endpoint === EModelEndpoint.azureOpenAI &&
      options.llmConfig?.azureOpenAIApiInstanceName != null &&
      provider !== Providers.AZURE
    ) {
      provider = Providers.AZURE;
    }

    /** @type {import('@librechat/agents').ClientOptions} */
    clientOptions = { ...options.llmConfig };
    if (options.configOptions) {
      clientOptions.configuration = options.configOptions;
    }

    // Ensure maxTokens is set for non-o1 models
    if (!/\b(o\d)\b/i.test(clientOptions.model) && !clientOptions.maxTokens) {
      clientOptions.maxTokens = 75;
    } else if (/\b(o\d)\b/i.test(clientOptions.model) && clientOptions.maxTokens != null) {
      delete clientOptions.maxTokens;
    }

    clientOptions = Object.assign(
      Object.fromEntries(
        Object.entries(clientOptions).filter(([key]) => !omitTitleOptions.has(key)),
      ),
    );

    if (provider === Providers.GOOGLE) {
      clientOptions.json = true;
    }

    try {
      const titleResult = await this.run.generateTitle({
        provider,
        inputText: text,
        contentParts: this.contentParts,
        clientOptions,
        chainOptions: {
          signal: abortController.signal,
          callbacks: [
            {
              handleLLMEnd,
            },
          ],
        },
      });

      const collectedUsage = collectedMetadata.map((item) => {
        let input_tokens, output_tokens;

        if (item.usage) {
          input_tokens =
            item.usage.prompt_tokens || item.usage.input_tokens || item.usage.inputTokens;
          output_tokens =
            item.usage.completion_tokens || item.usage.output_tokens || item.usage.outputTokens;
        } else if (item.tokenUsage) {
          input_tokens = item.tokenUsage.promptTokens;
          output_tokens = item.tokenUsage.completionTokens;
        }

        return {
          input_tokens: input_tokens,
          output_tokens: output_tokens,
        };
      });

      await this.recordCollectedUsage({
        model: clientOptions.model,
        context: 'title',
        collectedUsage,
      }).catch((err) => {
        logger.error(
          '[api/server/controllers/agents/client.js #titleConvo] Error recording collected usage',
          err,
        );
      });

      return titleResult.title;
    } catch (err) {
      logger.error('[api/server/controllers/agents/client.js #titleConvo] Error', err);
      return;
    }
  }

  /**
   * @param {object} params
   * @param {number} params.promptTokens
   * @param {number} params.completionTokens
   * @param {OpenAIUsageMetadata} [params.usage]
   * @param {string} [params.model]
   * @param {string} [params.context='message']
   * @returns {Promise<void>}
   */
  async recordTokenUsage({ model, promptTokens, completionTokens, usage, context = 'message' }) {
    try {
      await spendTokens(
        {
          model,
          context,
          conversationId: this.conversationId || 'unknown',
          user: this.user ?? this.options.req.user?.id,
          endpointTokenConfig: this.options.endpointTokenConfig,
        },
        { promptTokens, completionTokens },
      );

      if (
        usage &&
        typeof usage === 'object' &&
        'reasoning_tokens' in usage &&
        typeof usage.reasoning_tokens === 'number'
      ) {
        await spendTokens(
          {
            model,
            context: 'reasoning',
            conversationId: this.conversationId || 'unknown',
            user: this.user ?? this.options.req.user?.id,
            endpointTokenConfig: this.options.endpointTokenConfig,
          },
          { completionTokens: usage.reasoning_tokens },
        );
      }
    } catch (error) {
      logger.error(
        '[api/server/controllers/agents/client.js #recordTokenUsage] Error recording token usage',
        error,
      );
    }
  }

  getEncoding() {
    return 'o200k_base';
  }

  /**
   * Returns the token count of a given text. It also checks and resets the tokenizers if necessary.
   * @param {string} text - The text to get the token count for.
   * @returns {number} The token count of the given text.
   */
  getTokenCount(text) {
    const encoding = this.getEncoding();
    return Tokenizer.getTokenCount(text, encoding);
  }

  /**
   * sendMessage method - delegates to custom client if available, otherwise uses agent chatCompletion
   * @param {string} text - The message text
   * @param {object} messageOptions - The message options
   * @returns {Promise<object>} The response
   */
  async sendMessage(text, messageOptions = {}) {
    console.log('DEBUG: AGENTCLIENT SENDMESSAGE - Called with client type:', this.client?.constructor?.name);
    console.log('DEBUG: AGENTCLIENT SENDMESSAGE - messageOptions keys:', Object.keys(messageOptions));
    
    // Set conversationId from messageOptions to ensure this.conversationId is available
    if (messageOptions.conversationId && !this.conversationId) {
      console.log('DEBUG: AGENTCLIENT SENDMESSAGE - Setting this.conversationId from messageOptions:', messageOptions.conversationId);
      this.conversationId = messageOptions.conversationId;
    }
    
    // If we have a custom client (like EchoStreamClient), delegate to it
    if (this.client && typeof this.client.sendMessage === 'function') {
      console.log('DEBUG: AGENTCLIENT SENDMESSAGE - Delegating to custom client');
      
      // For custom clients, we need to build the conversation context properly
      // Get conversation history if available
      let conversationMessages = [];
      
      if (messageOptions.conversationId && this.options?.req) {
        console.log('DEBUG: AGENTCLIENT SENDMESSAGE - Need to fetch conversation history for:', messageOptions.conversationId);
        
        try {
          // Import the message retrieval function
          const { getMessages } = require('~/models/Message');
          
          // Get recent messages from the conversation
          const messages = await getMessages({ conversationId: messageOptions.conversationId }, '-createdAt');
          
          console.log('DEBUG: AGENTCLIENT SENDMESSAGE - Raw messages from DB:', messages ? messages.length : 'null', 'messages');
          if (messages && messages.length > 0) {
            console.log('DEBUG: AGENTCLIENT SENDMESSAGE - Sample message:', {
              role: messages[0].role,
              hasText: !!messages[0].text,
              textPreview: messages[0].text?.substring(0, 50)
            });
          }
          
          if (messages && messages.length > 0) {
            // Convert database messages to chat format
            conversationMessages = messages
              .filter(msg => msg.text && (msg.role === 'user' || msg.role === 'assistant'))
              .slice(-10) // Limit to last 10 messages to avoid token limits
              .reverse() // Reverse to get chronological order (oldest first)
              .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.text
              }));
            
            console.log('DEBUG: AGENTCLIENT SENDMESSAGE - Retrieved', conversationMessages.length, 'historical messages');
            console.log('DEBUG: AGENTCLIENT SENDMESSAGE - History preview:', conversationMessages.map((m, i) => `${i}: ${m.role} - ${m.content.substring(0, 30)}...`));
          }
        } catch (error) {
          console.log('DEBUG: AGENTCLIENT SENDMESSAGE - Error fetching conversation history:', error.message);
        }
      } else {
        console.log('DEBUG: AGENTCLIENT SENDMESSAGE - No conversation ID available for history retrieval:', {
          hasConversationId: !!messageOptions.conversationId,
          conversationId: messageOptions.conversationId,
          hasReq: !!this.options?.req
        });
      }
      
      // Add the current user message
      conversationMessages.push({
        role: 'user',
        content: text
      });
      
      // Pass conversation history to custom client
      const enhancedMessageOptions = {
        ...messageOptions,
        messages: conversationMessages
      };
      
      try {
        const result = await this.client.sendMessage(text, enhancedMessageOptions);
        console.log('DEBUG: AGENTCLIENT SENDMESSAGE - Custom client result:', result);
        return result;
      } catch (error) {
        console.log('DEBUG: AGENTCLIENT SENDMESSAGE - Custom client error:', error.message);
        throw error;
      }
    }
    
    // Fallback to regular agent behavior using chatCompletion
    console.log('DEBUG: AGENTCLIENT SENDMESSAGE - No custom client, using default agent chatCompletion');
    
    // Build payload for chatCompletion 
    const payload = {
      model: this.model,
      messages: [{ role: 'user', content: text }]
    };
    
    await this.chatCompletion({
      payload,
      onProgress: messageOptions.onProgress,
      abortController: messageOptions.abortController,
    });
    
    // Return the content parts which is what the normal agent flow produces
    const crypto = require('crypto');
    const responseMessageId = crypto.randomUUID();
    
    const response = { 
      text: this.contentParts.map(part => part.text || '').join(''),
      contentParts: this.contentParts,
      messageId: responseMessageId,
      conversationId: messageOptions.conversationId,
      endpoint: messageOptions.endpoint || this.options.endpoint,
      isCreatedByUser: false,
      error: false,
      // Add databasePromise to match expected format
      databasePromise: Promise.resolve({
        conversation: messageOptions.conversationId ? {
          id: messageOptions.conversationId,
          title: null
        } : {}
      })
    };
    
    console.log('DEBUG: AGENTCLIENT SENDMESSAGE - Normal agent response:', {
      hasText: !!response.text,
      textLength: response.text?.length,
      hasContentParts: !!response.contentParts,
      contentPartsLength: response.contentParts?.length,
      hasDbPromise: !!response.databasePromise,
      messageId: response.messageId,
      conversationId: response.conversationId,
      endpoint: response.endpoint
    });
    
    return response;
  }
}

module.exports = AgentClient;
