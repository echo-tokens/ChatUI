const { isUserProvided } = require('@librechat/api');
const { EModelEndpoint } = require('librechat-data-provider');
const { generateConfig } = require('~/server/utils/handleText');

const {
  // OPENAI_API_KEY: openAIApiKey,               // DISABLED - Provider disabled
  AZURE_ASSISTANTS_API_KEY: azureAssistantsApiKey,
  ASSISTANTS_API_KEY: assistantsApiKey,
  AZURE_API_KEY: azureOpenAIApiKey,
  // ANTHROPIC_API_KEY: anthropicApiKey,         // DISABLED - Provider disabled
  CHATGPT_TOKEN: chatGPTToken,
  PLUGINS_USE_AZURE,
  // GOOGLE_KEY: googleKey,                      // DISABLED - Provider disabled
  // OPENAI_REVERSE_PROXY,                       // DISABLED - Provider disabled
  AZURE_OPENAI_BASEURL,
  ASSISTANTS_BASE_URL,
  AZURE_ASSISTANTS_BASE_URL,
} = process.env ?? {};

const useAzurePlugins = !!PLUGINS_USE_AZURE;

const userProvidedOpenAI = useAzurePlugins
  ? isUserProvided(azureOpenAIApiKey)
  : false; // No longer using direct OpenAI

module.exports = {
  config: {
    // openAIApiKey,                              // DISABLED - Provider disabled
    azureOpenAIApiKey,
    useAzurePlugins,
    userProvidedOpenAI,
    // googleKey,                                 // DISABLED - Provider disabled
    [EModelEndpoint.anthropic]: generateConfig('blank', 'blank'),           // DISABLED
    [EModelEndpoint.chatGPTBrowser]: generateConfig(chatGPTToken),
    [EModelEndpoint.openAI]: generateConfig('blank', 'blank'),  // DISABLED
    [EModelEndpoint.google]: generateConfig('blank', 'blank'),  // DISABLED
    [EModelEndpoint.azureOpenAI]: generateConfig(azureOpenAIApiKey, AZURE_OPENAI_BASEURL),
    [EModelEndpoint.assistants]: generateConfig(
      assistantsApiKey,
      ASSISTANTS_BASE_URL,
      EModelEndpoint.assistants,
    ),
    [EModelEndpoint.azureAssistants]: generateConfig(
      azureAssistantsApiKey,
      AZURE_ASSISTANTS_BASE_URL,
      EModelEndpoint.azureAssistants,
    ),
    [EModelEndpoint.bedrock]: generateConfig(
      process.env.BEDROCK_AWS_SECRET_ACCESS_KEY ?? process.env.BEDROCK_AWS_DEFAULT_REGION,
    ),
    /* key will be part of separate config */
    [EModelEndpoint.agents]: generateConfig('true', undefined, EModelEndpoint.agents),
  },
};
