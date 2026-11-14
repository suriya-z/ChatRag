import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractApprovalNeededToolCall } from './approval-text.ts';

describe('extractApprovalNeededToolCall', () => {
  it('reads the approval marker', () => {
    const call = extractApprovalNeededToolCall('prefix __REQUIRES_APPROVAL__:call-1:gmail_send_email suffix');
    assert.ok(call);
    assert.equal(call.toolCallId, 'call-1');
    assert.equal(call.toolName, 'gmail_send_email');
    assert.deepEqual(call.args, { to: '', subject: '', body: '' });
  });

  it('returns null when the text has no approval marker', () => {
    assert.equal(extractApprovalNeededToolCall('hello'), null);
    assert.equal(extractApprovalNeededToolCall(''), null);
  });
});
