type SessionToolEntry = { tools: any[]; timestamp: number };

type Slot = { sessionTools?: Map<string, SessionToolEntry> };

/** Session tool cache lives on one process slot so duplicated module graphs share it. */
export function sessionTools(): Map<string, SessionToolEntry> {
  const bag = globalThis as Slot;
  if (!bag.sessionTools) bag.sessionTools = new Map();
  return bag.sessionTools;
}
