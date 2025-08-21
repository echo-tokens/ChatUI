const { CacheKeys } = require('librechat-data-provider');
const { loadDefaultModels, loadConfigModels } = require('~/server/services/Config');
const { getLogStores } = require('~/cache');
const { logger } = require('~/config');

// Hardcoded model restrictions - only allow these specific models
const ALLOWED_MODELS = {
  // Current OpenAI Models (via Echo Stream)
  openai:['gpt-4o', 'o1', 'gpt-4o-mini', 'gpt-5'],
  // Current Anthropic Models (via Echo Stream)
  anthropic:['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
  // Current Google Models (via Echo Stream)
  google:['gemini-2.0-flash-exp', 'gemini-1.5-pro-latest']
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

  // if (restrictedConfig.echo_stream) {
  //   restrictedConfig.echo_stream = restrictedConfig.echo_stream.filter(model => {
  //     for (const provider in ALLOWED_MODELS) {
  //       if (ALLOWED_MODELS[provider].includes(model)) {
  //         return true;
  //       }
  //     }
  //     return false;
  //   });
  // }

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
