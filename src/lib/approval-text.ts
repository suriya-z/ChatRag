export interface ApprovalToolCall {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

/** Parse an approval marker out of model text. One definition for the message module. */
export function extractApprovalNeededToolCall(text: string): ApprovalToolCall | null {
  if (!text || typeof text !== 'string') return null;

  const approvalPattern = /__REQUIRES_APPROVAL__:([^:,\s\}"]+):([^:,\s\}"]+)/g;
  const match = approvalPattern.exec(text);
  approvalPattern.lastIndex = 0;

  if (match) {
    const [, toolCallId, rawToolName] = match;
    const toolName = rawToolName.replace(/__REQUIRES_APPROVAL__$/, '');
    console.log('[extractApprovalNeededToolCall] Extracted approval format:', {
      toolCallId,
      toolName,
      rawToolName
    });

    let args: Record<string, unknown> = {};
    if (toolName.includes('gmail_find_email')) {
      args = { query: 'recent emails', maxResults: 5 };
    } else if (toolName.includes('gmail_create_draft')) {
      args = { to: '', subject: '', body: '' };
    } else if (toolName.includes('gmail_send_email')) {
      args = { to: '', subject: '', body: '' };
    } else if (toolName.includes('calendar')) {
      args = { query: 'upcoming events' };
    }

    return { type: 'tool-call', toolCallId, toolName, args };
  }

  const errorPattern = /Tool execution failed: Error executing tool ([^:]+): This tool requires explicit user approval/;
  const errorMatch = text.match(errorPattern);
  if (errorMatch) {
    const toolName = errorMatch[1].replace(/__REQUIRES_APPROVAL__$/, '');
    return { type: 'tool-call', toolCallId: `auto-${Date.now()}`, toolName, args: {} };
  }

  const directToolErrorPattern = /Error executing tool ([^:]+):/;
  const directToolMatch = text.match(directToolErrorPattern);
  if (directToolMatch) {
    const toolName = directToolMatch[1].replace(/__REQUIRES_APPROVAL__$/, '');
    return { type: 'tool-call', toolCallId: `auto-${Date.now()}`, toolName, args: {} };
  }

  return null;
}
