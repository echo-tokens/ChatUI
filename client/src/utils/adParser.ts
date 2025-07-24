import { ContentTypes } from 'librechat-data-provider';
import type { TMessageContentParts } from 'librechat-data-provider';

interface ParsedContent {
  type: 'text' | 'ad_tile';
  content?: string;
  text?: string;
  ad_content?: string;
}

/**
 * Parses text containing [ad]...[/ad] tags followed by optional [link]...[/link] tags
 * @param text The raw text containing potential ad tags
 * @returns Array of content parts with text and ad tiles
 */
export function parseAdContent(text: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  
  // Regular expression to match [ad]...[/ad] blocks optionally followed by [link]...[/link]
  const adRegex = /\[ad\]([\s\S]*?)\[\/ad\](\s*\[link\]([\s\S]*?)\[\/link\])?/g;
  let lastIndex = 0;
  let match;

  while ((match = adRegex.exec(text)) !== null) {
    const [fullMatch, adContent, linkSection, linkUrl] = match;
    const beforeAdText = text.slice(lastIndex, match.index);
    
    // Add text content before the ad (if any)
    if (beforeAdText.trim()) {
      parts.push({
        type: 'text',
        text: beforeAdText,
      });
    }
    
    // Combine ad content with link for the tile
    let tileContent = adContent.trim();
    if (linkUrl) {
      tileContent += `\n[link]${linkUrl.trim()}[/link]`;
    }
    
    // Add the ad content as a special ad tile part
    if (tileContent) {
      parts.push({
        type: 'ad_tile',
        ad_content: tileContent,
      });
    }
    
    lastIndex = adRegex.lastIndex;
  }
  
  // Add remaining text after the last ad (if any)
  const remainingText = text.slice(lastIndex);
  if (remainingText.trim()) {
    parts.push({
      type: 'text',
      text: remainingText,
    });
  }
  
  // If no ads were found, return the original text as a single part
  if (parts.length === 0 && text.trim()) {
    parts.push({
      type: 'text',
      text: text,
    });
  }
  
  return parts;
}

/**
 * Checks if a text contains ad tags
 * @param text The text to check
 * @returns boolean indicating if ad tags are present
 */
export function containsAdTags(text: string): boolean {
  return /\[ad\][\s\S]*?\[\/ad\]/g.test(text);
} 