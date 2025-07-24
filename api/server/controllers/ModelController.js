const { CacheKeys } = require('librechat-data-provider');
const { loadDefaultModels, loadConfigModels } = require('~/server/services/Config');
const { getLogStores } = require('~/cache');
const { logger } = require('~/config');

// Hardcoded model restrictions - only allow these specific models
const ALLOWED_MODELS = {
  openAI: ['gpt-4o', 'o1', 'gpt-4o-mini'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
  google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro-latest'],
  xai: ['grok-3-mini', 'grok-3'],
  echo_stream: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-2.0-flash', 'grok-3'] // Railway service models
};

/**
 * @param {ServerRequest} req
 */
const getModelsConfig = async (req) => {
  const cache = getLogStores(CacheKeys.CONFIG_STORE);
  let modelsConfig = await cache.get(CacheKeys.MODELS_CONFIG);
  if (!modelsConfig) {
    modelsConfig = await loadModels(req);
  }

  return modelsConfig;
};

/**
 * Loads the models from the config and applies hardcoded restrictions.
 * @param {ServerRequest} req - The Express request object.
 * @returns {Promise<TModelsConfig>} The models config.
 */
async function loadModels(req) {
  const cache = getLogStores(CacheKeys.CONFIG_STORE);
  
  // Clear the cache to ensure our hardcoded restrictions are always applied
  await cache.delete(CacheKeys.MODELS_CONFIG);
  
  const cachedModelsConfig = await cache.get(CacheKeys.MODELS_CONFIG);
  if (cachedModelsConfig) {
    return applyModelRestrictions(cachedModelsConfig);
  }
  const defaultModelsConfig = await loadDefaultModels(req);
  const customModelsConfig = await loadConfigModels(req);

  const modelConfig = { ...defaultModelsConfig, ...customModelsConfig };
  const restrictedModelConfig = applyModelRestrictions(modelConfig);

  await cache.set(CacheKeys.MODELS_CONFIG, restrictedModelConfig);
  return restrictedModelConfig;
}

/**
 * Applies hardcoded model restrictions to the model config.
 * @param {Object} modelConfig - The original model config.
 * @returns {Object} The restricted model config.
 */
function applyModelRestrictions(modelConfig) {
  const restrictedConfig = { ...modelConfig };

  // Apply OpenAI restrictions
  if (restrictedConfig.openAI) {
    restrictedConfig.openAI = restrictedConfig.openAI.filter(model => 
      ALLOWED_MODELS.openAI.includes(model)
    );
  }

  // Apply Anthropic restrictions
  if (restrictedConfig.anthropic) {
    restrictedConfig.anthropic = restrictedConfig.anthropic.filter(model => 
      ALLOWED_MODELS.anthropic.includes(model)
    );
  }

  // Apply Google restrictions
  if (restrictedConfig.google) {
    restrictedConfig.google = restrictedConfig.google.filter(model => 
      ALLOWED_MODELS.google.includes(model)
    );
  }

  // Apply xAI restrictions
  if (restrictedConfig.xai) {
    restrictedConfig.xai = restrictedConfig.xai.filter(model => 
      ALLOWED_MODELS.xai.includes(model)
    );
  }

  // Apply echo_stream restrictions
  if (restrictedConfig.echo_stream) {
    restrictedConfig.echo_stream = restrictedConfig.echo_stream.filter(model => 
      ALLOWED_MODELS.echo_stream.includes(model)
    );
  }

  // Remove any other endpoints that might exist
  const allowedEndpoints = ['openAI', 'anthropic', 'google', 'xai', 'echo_stream', 'initial'];
  Object.keys(restrictedConfig).forEach(endpoint => {
    if (!allowedEndpoints.includes(endpoint)) {
      delete restrictedConfig[endpoint];
    }
  });

  return restrictedConfig;
}

async function modelController(req, res) {
  try {
    const modelConfig = await loadModels(req);
    res.send(modelConfig);
  } catch (error) {
    logger.error('Error fetching models:', error);
    res.status(500).send({ error: error.message });
  }
}

module.exports = { modelController, loadModels, getModelsConfig };
