import { ContentTypes } from 'librechat-data-provider';
import type { TMessageContentParts } from 'librechat-data-provider';

interface ParsedContent {
  type: 'text' | 'ad_tile';
  content?: string;
  text?: string;
  ad_content?: string;
}

/**
 * Parses text containing [ad]...[/ad] tags and returns an array of content parts
 * Based on the original working implementation, extended to support [AD] and [LINK:url] formats
 * @param text The raw text containing potential ad tags
 * @returns Array of content parts with text and ad tiles
 */
export function parseAdContent(text: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  
  // Filter out debugging tags first (like original, but add this functionality)
  const cleanText = text.replace(/\[[\w\s-]*debugging[\w\s-]*\]\s*/gi, '');
  
  // Regular expression to match [ad]...[/ad] or [AD]...[/AD] blocks (extend original to support both)
  const adRegex = /\[(?:ad|AD)\]([\s\S]*?)\[\/(?:ad|AD)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = adRegex.exec(cleanText)) !== null) {
    const [fullMatch, adContent] = match;
    const beforeAdText = cleanText.slice(lastIndex, match.index);
    
    // Add text content before the ad (if any) - same as original
    if (beforeAdText.trim()) {
      parts.push({
        type: 'text',
        text: beforeAdText,
      });
    }
    
    // Process ad content - handle new [LINK:url] format but keep original logic
    let processedContent = adContent.trim();
    
    // Check for [LINK:url] format inside ad content and extract the link
    const linkMatch = processedContent.match(/\[(?:link|LINK):([^\]]+)\]/);
    if (linkMatch && linkMatch[1]) {
      // Remove the [LINK:url] from display content but keep link info for AdTile
      const displayContent = processedContent.replace(/\[(?:link|LINK):[^\]]+\]/, '').trim();
      const linkUrl = linkMatch[1].trim();
      
      // Store both content and link in a format the AdTile can use
      const adTileContent = `${displayContent}\n[link]${linkUrl}[/link]`;
      
      parts.push({
        type: 'ad_tile',
        ad_content: adTileContent,
      });
    } else {
      // No link, just add the content as-is (same as original)
      parts.push({
        type: 'ad_tile',
        ad_content: processedContent,
      });
    }
    
    lastIndex = adRegex.lastIndex;
  }
  
  // Add remaining text after the last ad (if any) - same as original
  const remainingText = cleanText.slice(lastIndex);
  if (remainingText.trim()) {
    parts.push({
      type: 'text',
      text: remainingText,
    });
  }
  
  // If no ads were found, return the original text as a single part - same as original (but with debug filtering)
  if (parts.length === 0 && cleanText.trim()) {
    parts.push({
      type: 'text',
      text: cleanText,
    });
  }
  
  return parts;
}

/**
 * Checks if a text contains ad tags - same as original but support both cases
 * @param text The text to check
 * @returns boolean indicating if ad tags are present
 */
export function containsAdTags(text: string): boolean {
  return /\[(?:ad|AD)\][\s\S]*?\[\/(?:ad|AD)\]/g.test(text);
} 