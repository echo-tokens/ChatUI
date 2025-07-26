import { TFile, TMessage, Constants } from 'librechat-data-provider';

type ParentMessage = TMessage & { children: TMessage[]; depth: number };
export default function buildTree({
  messages,
  fileMap,
}: {
  messages: TMessage[] | null;
  fileMap?: Record<string, TFile>;
}) {
  if (messages === null) {
    return null;
  }

  console.log('DEBUG: buildTree input messages order:', messages.map(m => ({
    id: m.messageId?.substring(0, 8),
    isUser: m.isCreatedByUser,
    parent: m.parentMessageId?.substring(0, 8) || m.parentMessageId,
    createdAt: m.createdAt
  })));

  const messageMap: Record<string, ParentMessage> = {};
  const rootMessages: TMessage[] = [];
  const childrenCount: Record<string, number> = {};

  // First pass: Create all messages in the map to handle any processing order
  messages.forEach((message) => {
    const parentId = message.parentMessageId === Constants.NO_PARENT ? '' : (message.parentMessageId ?? '');
    childrenCount[parentId] = (childrenCount[parentId] || 0) + 1;

    const extendedMessage: ParentMessage = {
      ...message,
      children: [],
      depth: 0,
      siblingIndex: childrenCount[parentId] - 1,
    };

    if (message.files && fileMap) {
      extendedMessage.files = message.files.map((file) => fileMap[file.file_id ?? ''] ?? file);
    }

    messageMap[message.messageId] = extendedMessage;
  });

  // Second pass: Build parent-child relationships now that all messages are in the map
  messages.forEach((message) => {
    const parentId = message.parentMessageId === Constants.NO_PARENT ? '' : (message.parentMessageId ?? '');
    const extendedMessage = messageMap[message.messageId];
    const parentMessage = messageMap[parentId];
    
    console.log('DEBUG: buildTree processing message:', {
      messageId: message.messageId?.substring(0, 8),
      originalParentId: message.parentMessageId,
      processedParentId: parentId,
      isCreatedByUser: message.isCreatedByUser,
      willBeRootMessage: !parentMessage,
      hasParentInMap: !!parentMessage,
      constantsNoParent: Constants.NO_PARENT
    });
    
    if (parentMessage) {
      parentMessage.children.push(extendedMessage);
      extendedMessage.depth = parentMessage.depth + 1;
    } else {
      rootMessages.push(extendedMessage);
    }
  });

  console.log('DEBUG: buildTree final result:', {
    rootMessagesCount: rootMessages.length,
    rootMessages: rootMessages.map(m => ({
      id: m.messageId?.substring(0, 8),
      isUser: m.isCreatedByUser,
      parent: m.parentMessageId,
      childrenCount: m.children?.length || 0,
      text: m.text?.substring(0, 30) + '...'
    }))
  });

  return rootMessages;
}

const even =
  'w-full border-b border-black/10 dark:border-gray-800/50 text-gray-800 bg-white dark:text-gray-200 group dark:bg-gray-800 hover:bg-gray-200/25 hover:text-gray-700  dark:hover:bg-gray-800 dark:hover:text-gray-200';
const odd =
  'w-full border-b border-black/10 bg-gray-50 dark:border-gray-800/50 text-gray-800 dark:text-gray-200 group bg-gray-200 dark:bg-gray-700 hover:bg-gray-200/40 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200';

export function groupIntoList({
  messages,
}: // fileMap,
{
  messages: TMessage[] | null;
  // fileMap?: Record<string, TFile>;
}) {
  if (messages === null) {
    return null;
  }
  return messages.map((m, idx) => ({ ...m, bg: idx % 2 === 0 ? even : odd }));
}
