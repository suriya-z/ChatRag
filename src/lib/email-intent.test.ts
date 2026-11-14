import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeEmailIntent } from './email-intent.ts';

describe('analyzeEmailIntent', () => {
  it('treats a send phrase as send', () => {
    const result = analyzeEmailIntent('please send an email to sam now');
    assert.equal(result.shouldSend, true);
    assert.ok(result.confidence > 0.5);
  });

  it('treats a draft phrase as draft', () => {
    const result = analyzeEmailIntent('please draft a note for later');
    assert.equal(result.shouldSend, false);
  });

  it('stays unsure when the message has no signal', () => {
    const result = analyzeEmailIntent('what is the weather');
    assert.equal(result.shouldSend, false);
    assert.equal(result.confidence, 0.1);
    assert.equal(result.reasoningText, 'No clear indicators found');
  });
});
