export interface ToolApprovalEntry {
  approved: boolean;
  executed?: boolean;
  toolCall: any;
  result: any;
}

export type ToolApprovalMap = Record<string, ToolApprovalEntry>;

type ProcessSlots = {
  toolApprovalState?: ToolApprovalMap;
  mcpImageContext?: Record<string, any>;
  sessionTools?: Map<string, { tools: any[]; timestamp: number }>;
};

function slots(): ProcessSlots {
  return globalThis as ProcessSlots;
}

/** One process-wide approval map. Callers never touch globalThis. */
export function ensureToolApprovalState(): ToolApprovalMap {
  const bag = slots();
  if (!bag.toolApprovalState) bag.toolApprovalState = {};
  return bag.toolApprovalState;
}

export function readToolApprovalState(): ToolApprovalMap | undefined {
  return slots().toolApprovalState;
}

/** One process-wide image context map. Absent until the chat POST stores an image. */
export function readMcpImageContext(): any {
  return slots().mcpImageContext;
}

export function ensureMcpImageContext(): Record<string, any> {
  const bag = slots();
  if (!bag.mcpImageContext) bag.mcpImageContext = {};
  return bag.mcpImageContext;
}
