const {
  CacheKeys,
  ErrorTypes,
  envVarRegex,
  FetchTokenConfig,
  extractEnvVariable,
} = require('librechat-data-provider');
const { Providers } = require('@librechat/agents');
const { getOpenAIConfig, createHandleLLMNewToken, resolveHeaders, getGoogleConfig } = require('@librechat/api');
const { getUserKeyValues, checkUserKeyExpiry } = require('~/server/services/UserService');
const { getCustomEndpointConfig } = require('~/server/services/Config');
const { fetchModels } = require('~/server/services/ModelService');
const EchoStreamClient = require('~/app/clients/EchoStreamClient');
const { isUserProvided } = require('~/server/utils');
const getLogStores = require('~/cache/getLogStores');

const { PROXY } = process.env;

/**
 * Determines which client to use based on the endpoint name first, then model name
 * @param {string} model - The model name
 * @param {string} endpoint - The endpoint name
 * @returns {string} - The client type ('openai', 'anthropic', 'google', 'echo_stream')
 */
function getClientType(model, endpoint) {
  return 'echo_stream';
}

/**
 * Determines if a Google model supports thinking features
 * @param {string} model - The model name
 * @returns {boolean} - Whether the model supports thinking
 */
function supportsThinking(model) {
  if (!model) return false;
  
  const modelLower = model.toLowerCase();
  
  // Only Gemini 2.5 series supports thinking
  return modelLower.includes('gemini-2.5') || modelLower.includes('gemini-2-5');
}

const initializeClient = async ({ req, res, endpointOption, optionsOnly, overrideEndpoint }) => {
  const { key: expiresAt } = req.body;
  const endpoint = overrideEndpoint ?? req.body.endpoint;
  
  console.log('DEBUG: Custom initialize called with:', {
    endpoint,
    overrideEndpoint,
    reqBodyEndpoint: req.body.endpoint,
    optionsOnly,
    model: endpointOption?.model_parameters?.model
  });

  const endpointConfig = await getCustomEndpointConfig(endpoint);
  if (!endpointConfig) {
    throw new Error(`Config not found for the ${endpoint} custom endpoint.`);
  }

  const CUSTOM_API_KEY = extractEnvVariable(endpointConfig.apiKey);
  const CUSTOM_BASE_URL = extractEnvVariable(endpointConfig.baseURL);

  let resolvedHeaders = resolveHeaders(endpointConfig.headers, req.user);

  if (CUSTOM_API_KEY.match(envVarRegex)) {
    throw new Error(`Missing API Key for ${endpoint}.`);
  }

  if (CUSTOM_BASE_URL.match(envVarRegex)) {
    throw new Error(`Missing Base URL for ${endpoint}.`);
  }

  const userProvidesKey = isUserProvided(CUSTOM_API_KEY);
  const userProvidesURL = isUserProvided(CUSTOM_BASE_URL);

  let userValues = null;
  if (expiresAt && (userProvidesKey || userProvidesURL)) {
    checkUserKeyExpiry(expiresAt, endpoint);
    userValues = await getUserKeyValues({ userId: req.user.id, name: endpoint });
  }

  let apiKey = userProvidesKey ? userValues?.apiKey : CUSTOM_API_KEY;
  let baseURL = userProvidesURL ? userValues?.baseURL : CUSTOM_BASE_URL;

  if (userProvidesKey & !apiKey) {
    throw new Error(
      JSON.stringify({
        type: ErrorTypes.NO_USER_KEY,
      }),
    );
  }

  if (userProvidesURL && !baseURL) {
    throw new Error(
      JSON.stringify({
        type: ErrorTypes.NO_BASE_URL,
      }),
    );
  }

  if (!apiKey) {
    throw new Error(`${endpoint} API key not provided.`);
  }

  if (!baseURL) {
    throw new Error(`${endpoint} Base URL not provided.`);
  }

  const cache = getLogStores(CacheKeys.TOKEN_CONFIG);
  const tokenKey =
    !endpointConfig.tokenConfig && (userProvidesKey || userProvidesURL)
      ? `${endpoint}:${req.user.id}`
      : endpoint;

  let endpointTokenConfig =
    !endpointConfig.tokenConfig &&
    FetchTokenConfig[endpoint.toLowerCase()] &&
    (await cache.get(tokenKey));

  if (
    FetchTokenConfig[endpoint.toLowerCase()] &&
    endpointConfig &&
    endpointConfig.models.fetch &&
    !endpointTokenConfig
  ) {
    await fetchModels({ apiKey, baseURL, name: endpoint, user: req.user.id, tokenKey });
    endpointTokenConfig = await cache.get(tokenKey);
  }

  const customOptions = {
    headers: resolvedHeaders,
    addParams: endpointConfig.addParams,
    dropParams: endpointConfig.dropParams,
    customParams: endpointConfig.customParams,
    titleConvo: endpointConfig.titleConvo,
    titleModel: endpointConfig.titleModel,
    forcePrompt: endpointConfig.forcePrompt,
    summaryModel: endpointConfig.summaryModel,
    modelDisplayLabel: endpointConfig.modelDisplayLabel,
    titleMethod: endpointConfig.titleMethod ?? 'completion',
    contextStrategy: endpointConfig.summarize ? 'summarize' : null,
    directEndpoint: endpointConfig.directEndpoint,
    titleMessageRole: endpointConfig.titleMessageRole,
    streamRate: endpointConfig.streamRate,
    endpointTokenConfig,
  };

  /** @type {undefined | TBaseEndpoint} */
  const allConfig = req.app.locals.all;
  if (allConfig) {
    customOptions.streamRate = allConfig.streamRate;
  }

  let clientOptions = {
    reverseProxyUrl: baseURL ?? null,
    proxy: PROXY ?? null,
    req,
    res,
    ...customOptions,
    ...endpointOption,
  };

  // Determine which client to use based on the model and endpoint
  const model = endpointOption?.model_parameters?.model;
  
  console.log('DEBUG: optionsOnly:', optionsOnly);
  console.log('DEBUG: model:', model);
  console.log('DEBUG: endpoint:', endpoint);

  // For echo_stream, we bypass optionsOnly to force actual client creation
  if (optionsOnly) {
    console.log('DEBUG: Bypassing optionsOnly for echo_stream - will create actual client instead');
  }

  // Create the appropriate client based on model type
  let client;
  let clientApiKey = apiKey;
  
  console.log('DEBUG: Creating EchoStreamClient');
  client = new EchoStreamClient(apiKey, clientOptions);

  const result = {
    client,
    clientApiKey: clientApiKey,
  };
  
  console.log('DEBUG: Final result of initializeClient - client type:', client.constructor.name, 'clientApiKey exists:', !!clientApiKey);
  
  return result;
};

module.exports = initializeClient;
