// Mock ContentTypes since we can't import from librechat-data-provider yet
const ContentTypes = {
  TEXT: 'text',
  AD_TILE: 'ad_tile'
};

const { mockRailwayStreamChunks, mockAdContent } = require('../../mocks/railway-responses');

// Mock the content handler logic that will parse Railway responses
const parseRailwayAdContent = (rawContent) => {
  // Extract ad content between [ad] tags
  const adMatch = rawContent.match(/\[ad\](.*?)\[\/ad\]/s);
  if (!adMatch) return null;
  
  const adContent = adMatch[1].trim();
  
  // Extract link from [link] tags
  const linkMatch = rawContent.match(/\[link\](.*?)\[\/link\]/);
  const link = linkMatch ? linkMatch[1] : null;
  
  return {
    type: ContentTypes.AD_TILE,
    content: adContent,
    link: link
  };
};

const simulateStreamProcessing = (chunks) => {
  let fullContent = '';
  const processedParts = [];
  
  chunks.forEach((chunk, index) => {
    const content = chunk.choices?.[0]?.delta?.content || '';
    fullContent += content;
    
    // Check for ad content in accumulated text
    const adData = parseRailwayAdContent(fullContent);
    if (adData) {
      processedParts.push({
        index: processedParts.length,
        type: ContentTypes.AD_TILE,
        [ContentTypes.AD_TILE]: {
          value: adData.content,
          link: adData.link
        }
      });
      
      // Remove ad tags from ongoing text stream
      fullContent = fullContent.replace(/\[ad\].*?\[\/ad\]\[link\].*?\[\/link\]/s, '');
    }
    
    // Add regular text content
    if (content && !content.includes('[ad]') && !content.includes('[link]')) {
      processedParts.push({
        index: processedParts.length,
        type: ContentTypes.TEXT,
        [ContentTypes.TEXT]: { value: content }
      });
    }
  });
  
  return processedParts;
};

describe('Railway Service Content Handler', () => {
  describe('Ad Content Parsing', () => {
    it('should extract ad content from Railway stream correctly', () => {
      const railwayResponse = "\n\n[ad]Premium AI Tools\n\nUnlock advanced AI capabilities with our premium subscription[/ad][link]https://your-site.com/premium[/link]\n\n";
      
      const result = parseRailwayAdContent(railwayResponse);
      
      expect(result).toEqual({
        type: ContentTypes.AD_TILE,
        content: "Premium AI Tools\n\nUnlock advanced AI capabilities with our premium subscription",
        link: "https://your-site.com/premium"
      });
    });

    it('should handle ad content without links', () => {
      const adOnlyResponse = "[ad]Premium AI Tools\n\nUnlock advanced capabilities[/ad]";
      
      const result = parseRailwayAdContent(adOnlyResponse);
      
      expect(result).toEqual({
        type: ContentTypes.AD_TILE,
        content: "Premium AI Tools\n\nUnlock advanced capabilities",
        link: null
      });
    });

    it('should return null for content without ad tags', () => {
      const regularResponse = "This is just regular text content from the LLM.";
      
      const result = parseRailwayAdContent(regularResponse);
      
      expect(result).toBeNull();
    });

    it('should handle malformed ad tags gracefully', () => {
      const malformedResponse = "[ad]Incomplete ad content[/a";
      
      const result = parseRailwayAdContent(malformedResponse);
      
      expect(result).toBeNull();
    });

    it('should extract first ad when multiple ads are present', () => {
      const multiAdResponse = "[ad]First Ad[/ad][link]link1[/link] and [ad]Second Ad[/ad][link]link2[/link]";
      
      const result = parseRailwayAdContent(multiAdResponse);
      
      expect(result.content).toBe("First Ad");
      expect(result.link).toBe("link1");
    });
  });

  describe('Stream Processing Integration', () => {
    it('should process Railway stream chunks correctly', () => {
      const processedParts = simulateStreamProcessing(mockRailwayStreamChunks);
      
      // Should contain both text and ad parts
      const textParts = processedParts.filter(part => part.type === ContentTypes.TEXT);
      const adParts = processedParts.filter(part => part.type === ContentTypes.AD_TILE);
      
      expect(textParts.length).toBeGreaterThan(0);
      expect(adParts.length).toBe(1);
      
      // Check ad content
      const adPart = adParts[0];
      expect(adPart[ContentTypes.AD_TILE].value).toContain("Premium AI Tools");
      expect(adPart[ContentTypes.AD_TILE].link).toBe("https://your-site.com/premium");
    });

    it('should handle stream without ads', () => {
      const textOnlyChunks = [
        { choices: [{ delta: { content: "Hello! " } }] },
        { choices: [{ delta: { content: "How can I help you today?" } }] }
      ];
      
      const processedParts = simulateStreamProcessing(textOnlyChunks);
      
      const adParts = processedParts.filter(part => part.type === ContentTypes.AD_TILE);
      expect(adParts.length).toBe(0);
      
      const textParts = processedParts.filter(part => part.type === ContentTypes.TEXT);
      expect(textParts.length).toBe(2);
    });

    it('should maintain proper indexing for mixed content', () => {
      const mixedChunks = [
        { choices: [{ delta: { content: "Before ad. " } }] },
        { choices: [{ delta: { content: "[ad]Test Ad[/ad][link]test.com[/link]" } }] },
        { choices: [{ delta: { content: " After ad." } }] }
      ];
      
      const processedParts = simulateStreamProcessing(mixedChunks);
      
      // Check that indices are sequential
      processedParts.forEach((part, i) => {
        expect(part.index).toBe(i);
      });
    });
  });

  describe('Content Type Handling', () => {
    it('should create proper ContentParts structure for ads', () => {
      const adContent = "Premium AI Tools\n\nTest description";
      const link = "https://test.com";
      
      const contentPart = {
        type: ContentTypes.AD_TILE,
        [ContentTypes.AD_TILE]: {
          value: adContent,
          link: link
        }
      };
      
      expect(contentPart.type).toBe(ContentTypes.AD_TILE);
      expect(contentPart[ContentTypes.AD_TILE].value).toBe(adContent);
      expect(contentPart[ContentTypes.AD_TILE].link).toBe(link);
    });

    it('should handle text content properly', () => {
      const textContent = "Regular response text";
      
      const contentPart = {
        type: ContentTypes.TEXT,
        [ContentTypes.TEXT]: { value: textContent }
      };
      
      expect(contentPart.type).toBe(ContentTypes.TEXT);
      expect(contentPart[ContentTypes.TEXT].value).toBe(textContent);
    });
  });

  describe('Railway Service Error Scenarios', () => {
    it('should handle empty stream chunks', () => {
      const emptyChunks = [
        { choices: [{ delta: {} }] },
        { choices: [{ delta: { content: "" } }] }
      ];
      
      const processedParts = simulateStreamProcessing(emptyChunks);
      
      expect(processedParts).toEqual([]);
    });

    it('should handle chunks with missing choices', () => {
      const malformedChunks = [
        { choices: null },
        { choices: [{ delta: { content: "Valid content" } }] },
        {}
      ];
      
      const processedParts = simulateStreamProcessing(malformedChunks);
      
      // Should only process the valid chunk
      expect(processedParts.length).toBe(1);
      expect(processedParts[0][ContentTypes.TEXT].value).toBe("Valid content");
    });

    it('should handle partial ad tags across chunks', () => {
      const partialChunks = [
        { choices: [{ delta: { content: "Text before [ad]Premium" } }] },
        { choices: [{ delta: { content: " AI Tools[/ad][link]test.com" } }] },
        { choices: [{ delta: { content: "[/link] Text after" } }] }
      ];
      
      const processedParts = simulateStreamProcessing(partialChunks);
      
      // Should eventually parse the complete ad
      const adParts = processedParts.filter(part => part.type === ContentTypes.AD_TILE);
      expect(adParts.length).toBe(1);
      expect(adParts[0][ContentTypes.AD_TILE].value).toContain("Premium AI Tools");
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large number of chunks efficiently', () => {
      const manyChunks = Array.from({ length: 1000 }, (_, i) => ({
        choices: [{ delta: { content: `Chunk ${i} ` } }]
      }));
      
      const startTime = Date.now();
      const processedParts = simulateStreamProcessing(manyChunks);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should process in under 1 second
      expect(processedParts.length).toBe(1000);
    });

    it('should handle very long ad content', () => {
      const longAdContent = "Very Long Ad Title ".repeat(50) + "\n\n" + "Very long description. ".repeat(100);
      const longAdResponse = `[ad]${longAdContent}[/ad][link]https://test.com[/link]`;
      
      const result = parseRailwayAdContent(longAdResponse);
      
      expect(result).not.toBeNull();
      expect(result.content).toBe(longAdContent);
      expect(result.link).toBe("https://test.com");
    });
  });
}); 