const { EModelEndpoint } = require('librechat-data-provider');
const { useAzurePlugins } = require('~/server/services/Config/EndpointService').config;
const {
  getOpenAIModels,
  getGoogleModels,
  getBedrockModels,
  getAnthropicModels,
} = require('~/server/services/ModelService');
const { logger } = require('~/config');

/**
 * Loads the default models for the application.
 * @async
 * @function
 * @param {Express.Request} req - The Express request object.
 */
async function loadDefaultModels(req) {
  try {
    const [
      // openAI,              // DISABLED - Provider disabled
      // anthropic,           // DISABLED - Provider disabled
      azureOpenAI,
      gptPlugins,
      assistants,
      azureAssistants,
      // google,              // DISABLED - Provider disabled
      bedrock,
    ] = await Promise.all([
      // getOpenAIModels({ user: req.user.id }).catch((error) => {           // DISABLED
      //   logger.error('Error fetching OpenAI models:', error);               // DISABLED
      //   return [];                                                          // DISABLED
      // }),                                                                   // DISABLED
      // getAnthropicModels({ user: req.user.id }).catch((error) => {         // DISABLED
      //   logger.error('Error fetching Anthropic models:', error);            // DISABLED
      //   return [];                                                          // DISABLED
      // }),                                                                   // DISABLED
      getOpenAIModels({ user: req.user.id, azure: true }).catch((error) => {
        logger.error('Error fetching Azure OpenAI models:', error);
        return [];
      }),
      getOpenAIModels({ user: req.user.id, azure: useAzurePlugins, plugins: true }).catch(
        (error) => {
          logger.error('Error fetching Plugin models:', error);
          return [];
        },
      ),
      getOpenAIModels({ assistants: true }).catch((error) => {
        logger.error('Error fetching OpenAI Assistants API models:', error);
        return [];
      }),
      getOpenAIModels({ azureAssistants: true }).catch((error) => {
        logger.error('Error fetching Azure OpenAI Assistants API models:', error);
        return [];
      }),
      // Promise.resolve(getGoogleModels()).catch((error) => {                // DISABLED
      //   logger.error('Error getting Google models:', error);                // DISABLED
      //   return [];                                                          // DISABLED
      // }),                                                                   // DISABLED
      Promise.resolve(getBedrockModels()).catch((error) => {
        logger.error('Error getting Bedrock models:', error);
        return [];
      }),
    ]);

    return {
      // [EModelEndpoint.openAI]: openAI,               // DISABLED - Provider disabled
      [EModelEndpoint.agents]: [],                      // Updated to empty array since openAI is disabled
      // [EModelEndpoint.google]: google,               // DISABLED - Provider disabled
      // [EModelEndpoint.anthropic]: anthropic,         // DISABLED - Provider disabled
      [EModelEndpoint.gptPlugins]: gptPlugins,
      [EModelEndpoint.azureOpenAI]: azureOpenAI,
      [EModelEndpoint.assistants]: assistants,
      [EModelEndpoint.azureAssistants]: azureAssistants,
      [EModelEndpoint.bedrock]: bedrock,
    };
  } catch (error) {
    logger.error('Error fetching default models:', error);
    throw new Error(`Failed to load default models: ${error.message}`);
  }
}

module.exports = loadDefaultModels;
