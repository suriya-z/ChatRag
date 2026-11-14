import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handleChatStreamEvent, type ChatStreamContext } from './chat-stream-reducer.ts';

function context(content: any = ''): ChatStreamContext & { commits: number } {
  const ctx = {
    streamState: { accumulator: '', fullStreamedContent: '' },
    streamingMessage: { content },
    streamingContentRef: { current: '' },
    toolCallNameById: new Map<string, string>(),
    commits: 0,
    updateStreamingText() {},
    handleDocumentReference() {},
    commitStreamingMessage() { ctx.commits += 1; },
    applyDocumentReferencesFromMetadata() {}
  };
  return ctx;
}

describe('handleChatStreamEvent', () => {
  it('appends text deltas', () => {
    const ctx = context();
    handleChatStreamEvent({ type: 'text-delta', delta: 'Hello' }, ctx);
    handleChatStreamEvent({ type: 'text-delta', delta: ' there' }, ctx);
    assert.equal(ctx.streamState.fullStreamedContent, 'Hello there');
  });

  it('puts source images ahead of existing text parts', () => {
    const ctx = context([{ type: 'text', text: 'answer' }]);
    handleChatStreamEvent({ type: 'source_images', source_images: [{ url: 'https://example.test/a.png' }] }, ctx);
    assert.equal(ctx.streamingMessage.content[0].type, 'source_images');
    assert.equal(ctx.commits, 1);
  });

  it('turns webSearch metadata into one tool-result part', () => {
    const ctx = context([]);
    handleChatStreamEvent({
      type: 'metadata',
      metadata: { webSearch: { toolCallId: 'ws-1', results: [{ title: 'Doc' }] } }
    }, ctx);
    assert.equal(ctx.streamingMessage.content.length, 1);
    assert.equal(ctx.streamingMessage.content[0].type, 'tool-result');
    assert.equal(ctx.streamingMessage.content[0].toolName, 'webSearch');
    assert.equal(ctx.streamingMessage.content[0].toolCallId, 'ws-1');
  });
});
