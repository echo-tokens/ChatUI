import type { Response as ServerResponse } from 'express';
import type { ServerSentEvent } from '~/types';

// Simple debug system for events
const DEBUG_GROUPS = process.env.DEBUG_GROUPS ? process.env.DEBUG_GROUPS.split(',') : ['STREAMING'];
function debug(group: string, message: string, ...args: any[]) {
  if (DEBUG_GROUPS.includes(group)) {
    const timestamp = new Date().toISOString();
    console.log(`DEBUG[${group}]: [${timestamp}] ${message}`, ...args);
  }
}

/**
 * Sends message data in Server Sent Events format.
 * @param res - The server response.
 * @param event - The message event.
 * @param event.event - The type of event.
 * @param event.data - The message to be sent.
 */
export function sendEvent(res: ServerResponse, event: ServerSentEvent): void {
  if (typeof event.data === 'string' && event.data.length === 0) {
    return;
  }
  
  // Track conversationId and messageId flow for SSE events
  debug('SSE', 'sendEvent - Sending SSE event:', {
    hasConversation: !!(event as any).conversation,
    conversationId: (event as any).conversation?.id,
    messageId: (event as any).messageId,
    final: (event as any).final,
    initial: (event as any).initial,
    message: (event as any).message,
    textLength: typeof (event as any).text === 'string' ? (event as any).text.length : 'not-string'
  });
  
  res.write(`event: message\ndata: ${JSON.stringify(event)}\n\n`);
}

/**
 * Sends error data in Server Sent Events format and ends the response.
 * @param res - The server response.
 * @param message - The error message.
 */
export function handleError(res: ServerResponse, message: string): void {
  res.write(`event: error\ndata: ${JSON.stringify(message)}\n\n`);
  res.end();
}
