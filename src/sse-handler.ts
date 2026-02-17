import type { SSEEvent } from './types.js';

export function parseSSEBuffer(buffer: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const lines = buffer.split('\n');

  let currentEvent: Partial<SSEEvent> = {};
  let dataLines: string[] = [];

  for (const line of lines) {
    if (line === '') {
      // Empty line marks end of event
      if (dataLines.length > 0 || currentEvent.type) {
        events.push({
          type: currentEvent.type || 'message',
          data: dataLines.join('\n'),
          id: currentEvent.id,
        });
        currentEvent = {};
        dataLines = [];
      }
      continue;
    }

    if (line.startsWith(':')) {
      // Comment, skip
      continue;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      // Field name only, treat value as empty string
      continue;
    }

    const field = line.slice(0, colonIndex);
    // Skip optional space after colon
    let value = line.slice(colonIndex + 1);
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }

    switch (field) {
      case 'event':
        currentEvent.type = value;
        break;
      case 'data':
        dataLines.push(value);
        break;
      case 'id':
        currentEvent.id = value;
        break;
      // 'retry' field is ignored
    }
  }

  // Handle any remaining data without trailing newline
  if (dataLines.length > 0 || currentEvent.type) {
    events.push({
      type: currentEvent.type || 'message',
      data: dataLines.join('\n'),
      id: currentEvent.id,
    });
  }

  return events;
}

export function isSSEContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return contentType.includes('text/event-stream');
}

export function consolidateSSEContent(events: SSEEvent[]): string {
  const contentParts: string[] = [];

  for (const event of events) {
    if (!event.data || event.data === '[DONE]') continue;

    try {
      const parsed = JSON.parse(event.data);

      // Handle OpenAI-style streaming format (choices[].delta.content)
      if (parsed.choices && Array.isArray(parsed.choices)) {
        for (const choice of parsed.choices) {
          if (choice.delta?.content) {
            contentParts.push(choice.delta.content);
          }
          // Also handle non-streaming format (message.content)
          if (choice.message?.content) {
            contentParts.push(choice.message.content);
          }
        }
      }

      // Handle direct content field
      if (parsed.content && typeof parsed.content === 'string') {
        contentParts.push(parsed.content);
      }
    } catch {
      // Not JSON, include raw data if non-empty
      if (event.data.trim()) {
        contentParts.push(event.data);
      }
    }
  }

  return contentParts.join('');
}
