import React from 'react';
import { EarthIcon } from 'lucide-react';
import { isAgentsEndpoint, isAssistantsEndpoint } from 'librechat-data-provider';
import type { Endpoint } from '~/common';
import { useModelSelectorContext } from '../ModelSelectorContext';
import { CustomMenuItem as MenuItem } from '../CustomMenu';

// Hardcoded model display name mappings
const MODEL_DISPLAY_NAMES = {
  // OpenAI models
  'gpt-4o': 'GPT-4o',
  'o1': 'o3',
  'gpt-4o-mini': 'o4-mini',
  
  // Anthropic models
  'claude-3-5-sonnet-20241022': 'Claude 4 Sonnet',
  'claude-3-opus-20240229': 'Claude 4 Opus',
  
  // Google models
  'gemini-2.0-flash-exp': 'Gemini 2.0 Flash',
  'gemini-1.5-pro-latest': 'Gemini 2.0 Pro',
  
  // xAI models
  'grok-3-mini': 'Grok 3 Mini',
  'grok-3': 'Grok 3',

  // Echo Stream models (Railway service)
  'echo_stream_gpt4o': 'Echo GPT-4o',
  'echo_stream_claude': 'Echo Claude',
  'echo_stream_gemini': 'Echo Gemini',
  'echo_stream_grok': 'Echo Grok'
};

interface EndpointModelItemProps {
  modelId: string | null;
  endpoint: Endpoint;
  isSelected: boolean;
}

export function EndpointModelItem({ modelId, endpoint, isSelected }: EndpointModelItemProps) {
  const { handleSelectModel } = useModelSelectorContext();
  let isGlobal = false;
  let modelName = modelId;
  const avatarUrl = endpoint?.modelIcons?.[modelId ?? ''] || null;

  // Apply hardcoded model display names first
  if (modelId && MODEL_DISPLAY_NAMES[modelId]) {
    modelName = MODEL_DISPLAY_NAMES[modelId];
  }
  // Then check for custom names if available (for agents/assistants)
  else if (endpoint && modelId && isAgentsEndpoint(endpoint.value) && endpoint.agentNames?.[modelId]) {
    modelName = endpoint.agentNames[modelId];

    const modelInfo = endpoint?.models?.find((m) => m.name === modelId);
    isGlobal = modelInfo?.isGlobal ?? false;
  } else if (
    endpoint &&
    modelId &&
    isAssistantsEndpoint(endpoint.value) &&
    endpoint.assistantNames?.[modelId]
  ) {
    modelName = endpoint.assistantNames[modelId];
  }

  return (
    <MenuItem
      key={modelId}
      onClick={() => handleSelectModel(endpoint, modelId ?? '')}
      className="flex h-8 w-full cursor-pointer items-center justify-start rounded-lg px-3 py-2 text-sm"
    >
      <div className="flex items-center gap-2">
        {avatarUrl ? (
          <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full">
            <img src={avatarUrl} alt={modelName ?? ''} className="h-full w-full object-cover" />
          </div>
        ) : (isAgentsEndpoint(endpoint.value) || isAssistantsEndpoint(endpoint.value)) &&
          endpoint.icon ? (
          <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full">
            {endpoint.icon}
          </div>
        ) : null}
        <span>{modelName}</span>
      </div>
      {isGlobal && <EarthIcon className="ml-auto size-4 text-green-400" />}
      {isSelected && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="block"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM16.0755 7.93219C16.5272 8.25003 16.6356 8.87383 16.3178 9.32549L11.5678 16.0755C11.3931 16.3237 11.1152 16.4792 10.8123 16.4981C10.5093 16.517 10.2142 16.3973 10.0101 16.1727L7.51006 13.4227C7.13855 13.014 7.16867 12.3816 7.57733 12.0101C7.98598 11.6386 8.61843 11.6687 8.98994 12.0773L10.6504 13.9039L14.6822 8.17451C15 7.72284 15.6238 7.61436 16.0755 7.93219Z"
            fill="currentColor"
          />
        </svg>
      )}
    </MenuItem>
  );
}

export function renderEndpointModels(
  endpoint: Endpoint | null,
  models: Array<{ name: string; isGlobal?: boolean }>,
  selectedModel: string | null,
  filteredModels?: string[],
) {
  const modelsToRender = filteredModels || models.map((model) => model.name);

  return modelsToRender.map(
    (modelId) =>
      endpoint && (
        <EndpointModelItem
          key={modelId}
          modelId={modelId}
          endpoint={endpoint}
          isSelected={selectedModel === modelId}
        />
      ),
  );
}
