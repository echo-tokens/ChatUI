import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockAdContent } from '../../mocks/railway-responses';
import AdTile from '../../../client/src/components/Chat/Messages/Content/Parts/AdTile';

describe('AdTile Component - Railway Service Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render ad title and description correctly', () => {
      const content = "Premium AI Tools\n\nUnlock advanced AI capabilities";
      
      render(<AdTile content={content} showCursor={false} />);
      
      expect(screen.getByText('Premium AI Tools')).toBeInTheDocument();
      expect(screen.getByText('Unlock advanced AI capabilities')).toBeInTheDocument();
    });

    it('should show cursor when showCursor is true', () => {
      const content = "Test Ad\n\nTest Description";
      
      render(<AdTile content={content} showCursor={true} />);
      
      expect(screen.getByText('|')).toBeInTheDocument();
    });

    it('should handle single line content gracefully', () => {
      const content = "Single Line Ad";
      
      render(<AdTile content={content} showCursor={false} />);
      
      expect(screen.getByText('Single Line Ad')).toBeInTheDocument();
    });
  });

  describe('Railway Service Format Parsing', () => {
    it('should parse Railway service multi-line format correctly', () => {
      const railwayContent = mockAdContent[0].content;
      
      render(<AdTile content={railwayContent} showCursor={false} />);
      
      expect(screen.getByText('Premium AI Tools')).toBeInTheDocument();
      expect(screen.getByText('Unlock advanced AI capabilities with our premium subscription')).toBeInTheDocument();
    });

    it('should handle content with extra whitespace and newlines', () => {
      const messyContent = "\n\n  Premium AI Tools  \n\n\n  Unlock advanced capabilities  \n\n";
      
      render(<AdTile content={messyContent} showCursor={false} />);
      
      expect(screen.getByText('Premium AI Tools')).toBeInTheDocument();
      expect(screen.getByText('Unlock advanced capabilities')).toBeInTheDocument();
    });

    it('should handle empty or whitespace-only content', () => {
      render(<AdTile content="   \n\n   " showCursor={false} />);
      
      // Should not crash and should render empty container
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  describe('Link Functionality', () => {
    it('should render as button when link is provided', () => {
      const content = "Test Ad\n\nTest Description";
      const link = "https://test.com";
      
      render(<AdTile content={content} showCursor={false} link={link} />);
      
      const adTile = screen.getByRole('button');
      expect(adTile).toBeInTheDocument();
      expect(adTile).toHaveAttribute('aria-label', 'Advertisement: Test Ad');
    });

    it('should open link in new tab when clicked', () => {
      const content = "Test Ad\n\nTest Description";
      const link = "https://test.com";
      
      render(<AdTile content={content} showCursor={false} link={link} />);
      
      const adTile = screen.getByRole('button');
      fireEvent.click(adTile);
      
      expect(window.open).toHaveBeenCalledWith(link, '_blank', 'noopener,noreferrer');
    });

    it('should show "Click to learn more" when link is present', () => {
      const content = "Test Ad\n\nTest Description";
      const link = "https://test.com";
      
      render(<AdTile content={content} showCursor={false} link={link} />);
      
      expect(screen.getByText('Click to learn more →')).toBeInTheDocument();
    });

    it('should render as banner when no link is provided', () => {
      const content = "Test Ad\n\nTest Description";
      
      render(<AdTile content={content} showCursor={false} />);
      
      const adTile = screen.getByRole('banner');
      expect(adTile).toBeInTheDocument();
      expect(adTile).toHaveAttribute('aria-label', 'Advertisement');
    });
  });

  describe('Animation and Styling', () => {
    it('should animate from hidden to visible', async () => {
      const content = "Test Ad\n\nTest Description";
      
      render(<AdTile content={content} showCursor={false} />);
      
      const adTile = screen.getByRole('banner');
      
      // Initially should have max-h-0 opacity-0
      expect(adTile).toHaveClass('max-h-0', 'opacity-0');
      
      // After animation delay, should become visible
      await waitFor(() => {
        expect(adTile).toHaveClass('max-h-96', 'opacity-100');
      }, { timeout: 100 });
    });

    it('should apply purple theme styling', () => {
      const content = "Test Ad\n\nTest Description";
      
      render(<AdTile content={content} showCursor={false} />);
      
      const adTile = screen.getByRole('banner');
      expect(adTile).toHaveClass('border-purple-300');
      expect(adTile).toHaveClass('bg-purple-50/50');
    });

    it('should apply hover styles when clickable', () => {
      const content = "Test Ad\n\nTest Description";
      const link = "https://test.com";
      
      render(<AdTile content={content} showCursor={false} link={link} />);
      
      const adTile = screen.getByRole('button');
      expect(adTile).toHaveClass('cursor-pointer');
      expect(adTile).toHaveClass('hover:bg-purple-100/50');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for clickable ads', () => {
      const content = "Premium AI Tools\n\nTest Description";
      const link = "https://test.com";
      
      render(<AdTile content={content} showCursor={false} link={link} />);
      
      const adTile = screen.getByRole('button');
      expect(adTile).toHaveAttribute('aria-label', 'Advertisement: Premium AI Tools');
      expect(adTile).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper ARIA labels for non-clickable ads', () => {
      const content = "Test Ad\n\nTest Description";
      
      render(<AdTile content={content} showCursor={false} />);
      
      const adTile = screen.getByRole('banner');
      expect(adTile).toHaveAttribute('aria-label', 'Advertisement');
      expect(adTile).toHaveAttribute('tabIndex', '-1');
    });

    it('should support keyboard navigation for clickable ads', () => {
      const content = "Test Ad\n\nTest Description";
      const link = "https://test.com";
      
      render(<AdTile content={content} showCursor={false} link={link} />);
      
      const adTile = screen.getByRole('button');
      
      // Focus the element
      adTile.focus();
      expect(adTile).toHaveFocus();
      
      // Press Enter
      fireEvent.keyDown(adTile, { key: 'Enter' });
      
      // Should open link (window.open is mocked)
      expect(window.open).toHaveBeenCalledWith(link, '_blank', 'noopener,noreferrer');
    });
  });

  describe('Railway Service Integration Scenarios', () => {
    it('should handle Railway ad format with metadata', () => {
      const railwayAd = mockAdContent[0];
      
      render(
        <AdTile 
          content={railwayAd.content} 
          showCursor={false} 
          link={railwayAd.link}
        />
      );
      
      expect(screen.getByText('Premium AI Tools')).toBeInTheDocument();
      expect(screen.getByText(/Unlock advanced AI capabilities/)).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Advertisement: Premium AI Tools');
    });

    it('should handle streaming content with partial updates', async () => {
      const { rerender } = render(
        <AdTile content="Premium AI" showCursor={true} />
      );
      
      expect(screen.getByText('Premium AI')).toBeInTheDocument();
      expect(screen.getByText('|')).toBeInTheDocument();
      
      // Simulate streaming update
      rerender(
        <AdTile content="Premium AI Tools\n\nUnlock advanced" showCursor={true} />
      );
      
      expect(screen.getByText('Premium AI Tools')).toBeInTheDocument();
      expect(screen.getByText('Unlock advanced')).toBeInTheDocument();
      
      // Final update with link
      rerender(
        <AdTile 
          content="Premium AI Tools\n\nUnlock advanced AI capabilities" 
          showCursor={false}
          link="https://test.com"
        />
      );
      
      expect(screen.getByText('Premium AI Tools')).toBeInTheDocument();
      expect(screen.getByText('Unlock advanced AI capabilities')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.queryByText('|')).not.toBeInTheDocument();
    });

    it('should handle different ad categories correctly', () => {
      const educationAd = mockAdContent[1];
      
      render(
        <AdTile 
          content={educationAd.content} 
          showCursor={false} 
          link={educationAd.link}
        />
      );
      
      expect(screen.getByText('Online Courses')).toBeInTheDocument();
      expect(screen.getByText('Learn new skills with expert-led online courses')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed content gracefully', () => {
      const malformedContent = "Title\n\n\n\n\nDescription\n\n\n";
      
      render(<AdTile content={malformedContent} showCursor={false} />);
      
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should handle very long content appropriately', () => {
      const longContent = "Very Long Title That Might Overflow".repeat(5) + 
                         "\n\n" + 
                         "Very long description that might cause layout issues. ".repeat(20);
      
      render(<AdTile content={longContent} showCursor={false} />);
      
      const adTile = screen.getByRole('banner');
      expect(adTile).toBeInTheDocument();
      // Should not crash and should render with proper styling
      expect(adTile).toHaveClass('overflow-hidden');
    });

    it('should handle invalid URLs gracefully', () => {
      const content = "Test Ad\n\nTest Description";
      const invalidLink = "not-a-valid-url";
      
      render(<AdTile content={content} showCursor={false} link={invalidLink} />);
      
      const adTile = screen.getByRole('button');
      fireEvent.click(adTile);
      
      // Should still attempt to open (window.open handles invalid URLs)
      expect(window.open).toHaveBeenCalledWith(invalidLink, '_blank', 'noopener,noreferrer');
    });
  });
}); 