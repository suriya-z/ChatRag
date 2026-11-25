type ChatAuthInput = {
  authEnabled: boolean;
  userId: string | null;
  apiKey: string | null;
  internalApiKey: string;
};

export function isChatRequestAuthorized({ authEnabled, userId, apiKey, internalApiKey }: ChatAuthInput): boolean {
  if (!authEnabled) return true;
  if (userId) return true;
  return Boolean(internalApiKey) && apiKey === internalApiKey;
}
