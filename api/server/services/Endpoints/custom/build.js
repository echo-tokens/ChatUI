const { removeNullishValues, Constants } = require('librechat-data-provider');
const generateArtifactsPrompt = require('~/app/clients/prompts/artifacts');

const buildOptions = (endpoint, parsedBody, endpointType) => {
  const {
    modelLabel,
    chatGptLabel,
    promptPrefix,
    maxContextTokens,
    resendFiles = true,
    imageDetail,
    iconURL,
    greeting,
    spec,
    artifacts,
    ...modelOptions
  } = parsedBody;
  const endpointOption = removeNullishValues({
    endpoint,
    endpointType,
    modelLabel,
    chatGptLabel,
    promptPrefix,
    resendFiles,
    imageDetail,
    iconURL,
    greeting,
    spec,
    maxContextTokens,
    modelOptions,
  });

  if (typeof artifacts === 'string') {
    endpointOption.artifactsPrompt = generateArtifactsPrompt({ endpoint, artifacts });
  }

  // Special handling for echo_stream: create a fake agent promise to satisfy agents controller
  if (endpoint === 'echo_stream') {
    console.log('DEBUG: CUSTOM BUILD - Creating fake agent for echo_stream compatibility');
    
    // Create a minimal agent object that satisfies the agents controller
    const fakeAgent = {
      id: Constants.EPHEMERAL_AGENT_ID,
      name: 'EchoStream Agent',
      instructions: 'You are a helpful assistant powered by the echo stream service.',
      provider: 'echo_stream',
      endpoint: 'echo_stream',
      model: modelOptions.model || 'gpt-4o-mini',
      model_parameters: {
        model: modelOptions.model || 'gpt-4o-mini',
        ...modelOptions
      },
      tools: [],
      tool_resources: {}
    };
    
    // Add the agent promise that the agents controller expects
    endpointOption.agent = Promise.resolve(fakeAgent);
    
    console.log('DEBUG: CUSTOM BUILD - Added fake agent with model:', fakeAgent.model);
  }

  return endpointOption;
};

module.exports = buildOptions;
