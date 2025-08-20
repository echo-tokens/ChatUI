import { memo } from 'react';
import AdTile from './AdTile';
import InlinePreferenceTask from './InlinePreferenceTask';
import DropdownTask from './DropdownTask';

interface AdOrTaskTileProps {
  content: Record<string, any>;
  isStreaming: boolean;
}

// dropdown is always for the existing ad

type SelectionMethod = 'pick_one' | 'pick_multiple' | 'free_response' | 'insertion_location' | 'likert' | 'AB_click' | 'AB_rating' | 'comparison';
type InlineSelectionMethod = 'pick_one' | 'pick_multiple' | 'AB_click';

interface ParsedAdData {
  task?: {
    id: string;
    price_usd: string;
    instructions: string;
    selection_method: SelectionMethod;
    dropdown_options?: Array<string>;
  };
  ads?: Array<{
    clickthrough_link: string;
    advertiser: string;
    contextualized_ad: string;
  }>;
  ui_display?: string;
}

const AdOrTaskTile = memo(({ content, isStreaming }: AdOrTaskTileProps) => {
  // Parse the ad content to extract JSON data
  const parseAdContent = (content: Record<string, any>): ParsedAdData | null => {
    try {
      return content as ParsedAdData;
    } catch (error) {
      console.error('Error parsing ad content:', error);
      return null;
    }
  };

  const adData = parseAdContent(content);
  const uiDisplay = adData?.ui_display;

  // tasks that don't require ads ABOVE this point

  if (!adData || !adData.ads) {
    return null;
  }

  if ((uiDisplay === 'inline_preference' || uiDisplay === 'side-by-side') && adData.task) {
    return <InlinePreferenceTask adData={adData} isStreaming={isStreaming} />;
  }

  if (uiDisplay === 'dropdown' && adData.task) {
    return <DropdownTask adData={adData} isStreaming={isStreaming} />;
  }

  if (uiDisplay === 'ad_tile') {
    return <AdTile link={adData.ads[0].clickthrough_link} advertiser={adData.ads[0].advertiser} contextualized_ad={adData.ads[0].contextualized_ad} isStreaming={isStreaming} />;
  }

  // Default: show simple ad tile for ads without ui_display or task
  if (adData.ads && adData.ads.length > 0) {
    return <AdTile link={adData.ads[0].clickthrough_link} advertiser={adData.ads[0].advertiser} contextualized_ad={adData.ads[0].contextualized_ad} isStreaming={isStreaming} />;
  }

  return null;
});

export default AdOrTaskTile;
export type { SelectionMethod, InlineSelectionMethod };
