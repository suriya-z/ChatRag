import { ToolExecutionStateService } from '@/lib/tool-execution-state';

export interface ToolInvocation {
  toolName: string;
  params: any;
  toolCallId: string;
  sessionId?: string | null;
  messageIndex: number;
  logLabel: string;
  yoloEnabled: boolean;
  execute: (toolName: string, params: any) => Promise<any>;
  approvalMessage?: string;
}

/**
 * One execute-or-approval path for cached, discovered, and enhanced tool stubs.
 * Callers shape params first; this module owns the YOLO decision and persistence.
 */
export async function executeToolOrRequestApproval(invocation: ToolInvocation): Promise<any> {
  const {
    toolName,
    params,
    toolCallId,
    sessionId,
    messageIndex,
    logLabel,
    yoloEnabled,
    execute,
    approvalMessage
  } = invocation;

  console.log(`[${logLabel}] YOLO mode enabled: ${yoloEnabled}`);

  if (yoloEnabled) {
    console.log(`[${logLabel}] Auto-approving tool ${toolName} due to YOLO mode`);

    if (sessionId) {
      await ToolExecutionStateService.upsert({
        chat_id: sessionId,
        message_id: messageIndex,
        tool_call_id: toolCallId,
        tool_name: toolName,
        tool_params: params,
        status: 'running'
      });
    }

    try {
      const result = await execute(toolName, params);
      if (sessionId) {
        await ToolExecutionStateService.markCompleted(toolCallId, result);
      }
      return result;
    } catch (error) {
      if (sessionId) {
        await ToolExecutionStateService.markError(
          toolCallId,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      throw error;
    }
  }

  const approvalError = new Error(
    approvalMessage ?? 'This tool requires explicit user approval before execution.'
  );
  Object.assign(approvalError, {
    toolCallId,
    toolName,
    toolArgs: params
  });
  throw approvalError;
}
