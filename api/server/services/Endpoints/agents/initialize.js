const { logger } = require('@librechat/data-schemas');
const { createContentAggregator } = require('@librechat/agents');
const {
  Constants,
  EModelEndpoint,
  isAgentsEndpoint,
  getResponseSender,
} = require('librechat-data-provider');
const {
  createToolEndCallback,
  getDefaultHandlers,
} = require('~/server/controllers/agents/callbacks');
const { initializeAgent } = require('~/server/services/Endpoints/agents/agent');
const { getCustomEndpointConfig } = require('~/server/services/Config');
const { loadAgentTools } = require('~/server/services/ToolService');
const AgentClient = require('~/server/controllers/agents/client');
const { getAgent } = require('~/models/Agent');

function createToolLoader() {
  /**
   * @param {object} params
   * @param {ServerRequest} params.req
   * @param {ServerResponse} params.res
   * @param {string} params.agentId
   * @param {string[]} params.tools
   * @param {string} params.provider
   * @param {string} params.model
   * @param {AgentToolResources} params.tool_resources
   * @returns {Promise<{ tools: StructuredTool[], toolContextMap: Record<string, unknown> } | undefined>}
   */
  return async function loadTools({ req, res, agentId, tools, provider, model, tool_resources }) {
    const agent = { id: agentId, tools, provider, model };
    try {
      return await loadAgentTools({
        req,
        res,
        agent,
        tool_resources,
      });
    } catch (error) {
      logger.error('Error loading tools for agent ' + agentId, error);
    }
  };
}

const initializeClient = async ({ req, res, endpointOption }) => {
  if (!endpointOption) {
    throw new Error('Endpoint option not provided');
  }

  // TODO: use endpointOption to determine options/modelOptions
  /** @type {Array<UsageMetadata>} */
  const collectedUsage = [];
  /** @type {ArtifactPromises} */
  const artifactPromises = [];
  const { contentParts, aggregateContent } = createContentAggregator();
  const toolEndCallback = createToolEndCallback({ req, res, artifactPromises });
  const eventHandlers = getDefaultHandlers({
    res,
    aggregateContent,
    toolEndCallback,
    collectedUsage,
  });

  // Check if this is actually an agents endpoint
  const { isAgentsEndpoint } = require('librechat-data-provider');
  const isActualAgentsEndpoint = isAgentsEndpoint(endpointOption.endpoint);
  
  console.log('DEBUG: AGENTS/INITIALIZE - Endpoint check:', {
    endpoint: endpointOption.endpoint,
    isActualAgentsEndpoint,
    hasAgentPromise: !!endpointOption.agent
  });

  if (!isActualAgentsEndpoint) {
    // This is a normal endpoint (like OpenAI) being routed through agents
    // Route to the proper endpoint initialization function
    console.log('DEBUG: AGENTS/INITIALIZE - Creating regular client for non-agents endpoint:', endpointOption.endpoint);
    
    const endpoint = endpointOption.endpoint;
    let initializeRegularClient;
    
    switch (endpoint) {
      case 'openAI':
      case 'azureOpenAI':
        initializeRegularClient = require('~/server/services/Endpoints/openAI/initialize');
        break;
      case 'google':
        initializeRegularClient = require('~/server/services/Endpoints/google/initialize');
        break;
      case 'anthropic':
        initializeRegularClient = require('~/server/services/Endpoints/anthropic/initialize');
        break;
      case 'bedrock':
        initializeRegularClient = require('~/server/services/Endpoints/bedrock/initialize');
        break;
      case 'assistants':
        initializeRegularClient = require('~/server/services/Endpoints/assistants/initalize');
        break;
      case 'azureAssistants':
        initializeRegularClient = require('~/server/services/Endpoints/azureAssistants/initialize');
        break;
      default:
        // For custom endpoints like echo_stream
        initializeRegularClient = require('~/server/services/Endpoints/custom/initialize');
        break;
    }
    
    console.log('DEBUG: AGENTS/INITIALIZE - Using initialize function for endpoint:', endpoint);
    return await initializeRegularClient({ req, res, endpointOption });
  }

  if (!endpointOption.agent) {
    throw new Error('No agent promise provided');
  }

  const primaryAgent = await endpointOption.agent;
  delete endpointOption.agent;
  if (!primaryAgent) {
    throw new Error('Agent not found');
  }

  const agentConfigs = new Map();
  /** @type {Set<string>} */
  const allowedProviders = new Set(req?.app?.locals?.[EModelEndpoint.agents]?.allowedProviders);

  const loadTools = createToolLoader();
  /** @type {Array<MongoFile>} */
  const requestFiles = req.body.files ?? [];
  /** @type {string} */
  const conversationId = req.body.conversationId;

  const primaryConfig = await initializeAgent({
    req,
    res,
    loadTools,
    requestFiles,
    conversationId,
    agent: primaryAgent,
    endpointOption,
    allowedProviders,
    isInitialAgent: true,
  });

  console.log('DEBUG: AGENTS/INITIALIZE - Primary config after initializeAgent:', {
    endpoint: primaryConfig.endpoint,
    provider: primaryConfig.provider,
    model: primaryConfig.model_parameters?.model
  });

  const agent_ids = primaryConfig.agent_ids;
  if (agent_ids?.length) {
    for (const agentId of agent_ids) {
      const agent = await getAgent({ id: agentId });
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }
      const config = await initializeAgent({
        req,
        res,
        agent,
        loadTools,
        requestFiles,
        conversationId,
        endpointOption,
        allowedProviders,
      });
      agentConfigs.set(agentId, config);
    }
  }

  let endpointConfig = req.app.locals[primaryConfig.endpoint];
  if (!isAgentsEndpoint(primaryConfig.endpoint) && !endpointConfig) {
    try {
      endpointConfig = await getCustomEndpointConfig(primaryConfig.endpoint);
    } catch (err) {
      logger.error(
        '[api/server/controllers/agents/client.js #titleConvo] Error getting custom endpoint config',
        err,
      );
    }
  }

  const sender =
    primaryAgent.name ??
    getResponseSender({
      ...endpointOption,
      model: endpointOption.model_parameters.model,
      modelDisplayLabel: endpointConfig?.modelDisplayLabel,
      modelLabel: endpointOption.model_parameters.modelLabel,
    });

  console.log('DEBUG: AGENTS/INITIALIZE - Creating AgentClient with primaryConfig:', {
    agentModel: primaryConfig?.model_parameters?.model,
    endpoint: primaryConfig?.endpoint,
    provider: primaryConfig?.provider
  });

  // For custom endpoints (like echo_stream), we need to get the actual client
  let customClient = null;
  console.log('DEBUG: AGENTS/INITIALIZE - Checking if we need custom client. Endpoint:', primaryConfig.endpoint, 'vs agents:', EModelEndpoint.agents);
  
  if (primaryConfig.endpoint && primaryConfig.endpoint !== EModelEndpoint.agents) {
    console.log('DEBUG: AGENTS/INITIALIZE - Detected custom endpoint, getting custom client');
    try {
      const customInitialize = require('~/server/services/Endpoints/custom/initialize');
      const customResult = await customInitialize({
        req,
        res,
        endpointOption,
        optionsOnly: false,
        overrideEndpoint: primaryConfig.endpoint
      });
      
      console.log('DEBUG: AGENTS/INITIALIZE - Custom initialize result:', {
        hasResult: !!customResult,
        hasClient: !!customResult?.client,
        clientType: customResult?.client?.constructor?.name
      });
      
      if (customResult && customResult.client) {
        customClient = customResult.client;
        console.log('DEBUG: AGENTS/INITIALIZE - Got custom client:', customClient.constructor.name);
      }
    } catch (error) {
      console.log('DEBUG: AGENTS/INITIALIZE - Error getting custom client:', error.message);
    }
  }

  const client = new AgentClient({
    req,
    res,
    sender,
    contentParts,
    agentConfigs,
    eventHandlers,
    collectedUsage,
    aggregateContent,
    artifactPromises,
    agent: primaryConfig,
    client: customClient, // Pass the custom client
    spec: endpointOption.spec,
    iconURL: endpointOption.iconURL,
    attachments: primaryConfig.attachments,
    endpointType: endpointOption.endpointType,
    resendFiles: primaryConfig.resendFiles ?? true,
    maxContextTokens: primaryConfig.maxContextTokens,
    endpoint:
      primaryConfig.id === Constants.EPHEMERAL_AGENT_ID
        ? primaryConfig.endpoint
        : EModelEndpoint.agents,
  });

  return { client };
};

module.exports = { initializeClient };
