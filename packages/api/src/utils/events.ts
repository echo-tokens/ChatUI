import type { Response as ServerResponse } from 'express';
import type { ServerSentEvent } from '~/types';

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
  
  // Add minimal debugging to track conversationId data flow
  console.log('DEBUG: sendEvent - Sending SSE with conversationId:', {
    hasConversation: !!(event as any).conversation,
    conversationId: (event as any).conversation?.id,
    final: (event as any).final
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
