import { memo } from 'react';
import AdTile from './AdTile';
import InlinePreferenceTask from './InlinePreferenceTask';
import DropdownTask from './DropdownTask';

interface AdOrTaskTileProps {
  content: Record<string, any>;
  showCursor: boolean;
}

// dropdown is always for the existing ad

type SelectionMethod = 'pick_one' | 'pick_multiple' | 'free_response' | 'insertion_location' | 'likert';
type InlineSelectionMethod = 'pick_one' | 'pick_multiple';

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

const AdOrTaskTile = memo(({ content, showCursor }: AdOrTaskTileProps) => {
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

  if (uiDisplay === 'inline_preference' && adData.task) {
    console.log('Inline preference requested:', adData);
    return <InlinePreferenceTask adData={adData} />;
  }

  if (uiDisplay === 'dropdown' && adData.task) {
    console.log('Dropdown task requested:', adData);
    return <DropdownTask adData={adData} showCursor={showCursor} />;
  }

  if (uiDisplay === 'ad_tile') {
    console.log('Ad tile display requested:', adData);
    return <AdTile link={adData.ads[0].clickthrough_link} advertiser={adData.ads[0].advertiser} contextualized_ad={adData.ads[0].contextualized_ad} showCursor={showCursor} />;
  }

  return null;
});

export default AdOrTaskTile;
export type { SelectionMethod, InlineSelectionMethod };
