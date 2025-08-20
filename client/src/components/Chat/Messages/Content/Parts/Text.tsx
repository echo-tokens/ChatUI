import { memo, useMemo, ReactElement } from 'react';
import { useRecoilValue } from 'recoil';
import MarkdownLite from '~/components/Chat/Messages/Content/MarkdownLite';
import Markdown from '~/components/Chat/Messages/Content/Markdown';
import { useChatContext, useMessageContext } from '~/Providers';
import { parseAdContent, containsAdTags } from '~/utils/adParser';
import AdOrTaskTile from './AdOrTaskTile';
import { cn } from '~/utils';
import store from '~/store';

type TextPartProps = {
  text: string;
  showCursor: boolean;
  isCreatedByUser: boolean;
};

type ContentType =
  | ReactElement<React.ComponentProps<typeof Markdown>>
  | ReactElement<React.ComponentProps<typeof MarkdownLite>>
  | ReactElement;

const TextPart = memo(({ text, isCreatedByUser, showCursor }: TextPartProps) => {
  const { messageId } = useMessageContext();
  const { isSubmitting, latestMessage } = useChatContext();
  const enableUserMsgMarkdown = useRecoilValue(store.enableUserMsgMarkdown);
  const showCursorState = useMemo(() => showCursor && isSubmitting, [showCursor, isSubmitting]);
  const isLatestMessage = useMemo(
    () => messageId === latestMessage?.messageId,
    [messageId, latestMessage?.messageId],
  );

  // Parse ad content if present
  const contentParts = useMemo(() => {
    if (!containsAdTags(text)) {
      // No ads, return single content part
      if (!isCreatedByUser) {
        return [<Markdown key="text" content={text} isLatestMessage={isLatestMessage} />];
      } else if (enableUserMsgMarkdown) {
        return [<MarkdownLite key="text" content={text} />];
      } else {
        return [<span key="text">{text}</span>];
      }
    }

    // Has ads, parse and create multiple content parts
    const parsedParts = parseAdContent(text);
    let isLastPart = false;
    
    return parsedParts.map((part, index) => {
      isLastPart = index === parsedParts.length - 1;
      const partShowCursor = isLastPart && showCursor;
      
      if (part.type === 'text' || isCreatedByUser) {
        const partText = typeof part.text === 'string' ? part.text : part.text?.value || '';
        if (!isCreatedByUser) {
          return (
            <Markdown 
              key={`text-${index}`} 
              content={partText} 
              isLatestMessage={isLatestMessage} 
            />
          );
        } else if (enableUserMsgMarkdown) {
          return <MarkdownLite key={`text-${index}`} content={partText} />;
        } else {
          return <span key={`text-${index}`}>{partText}</span>;
        }
      } else if (part.type === 'ad_tile') {
        return (
          <AdOrTaskTile 
            key={`ad-${index}`} 
            content={part.ad_content} 
            isStreaming={isSubmitting}
          />
        );
      }
      return null;
    }).filter(Boolean);
  }, [text, isCreatedByUser, enableUserMsgMarkdown, isLatestMessage, isSubmitting, showCursor]);

  return (
    <div
      className={cn(
        isSubmitting ? 'submitting' : '',
        showCursorState && !!text.length ? 'result-streaming' : '',
        'markdown prose message-content dark:prose-invert light w-full break-words',
        isCreatedByUser && !enableUserMsgMarkdown && 'whitespace-pre-wrap',
        isCreatedByUser ? 'dark:text-gray-20' : 'dark:text-gray-100',
      )}
    >
      {contentParts}
    </div>
  );
});

export default TextPart;
