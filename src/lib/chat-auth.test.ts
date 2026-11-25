import { describe, it, expect } from 'vitest';
import { isChatRequestAuthorized } from './chat-auth';

describe('isChatRequestAuthorized', () => {
  it('allows anyone when auth is disabled', () => {
    expect(isChatRequestAuthorized({ authEnabled: false, userId: null, apiKey: null, internalApiKey: '' })).toBe(true);
  });

  it('allows a signed-in user when auth is enabled', () => {
    expect(isChatRequestAuthorized({ authEnabled: true, userId: 'user-1', apiKey: null, internalApiKey: '' })).toBe(true);
  });

  it('rejects an anonymous request when auth is enabled', () => {
    expect(isChatRequestAuthorized({ authEnabled: true, userId: null, apiKey: null, internalApiKey: 'secret' })).toBe(false);
  });

  it('allows a server-to-server request carrying the internal API key', () => {
    expect(isChatRequestAuthorized({ authEnabled: true, userId: null, apiKey: 'secret', internalApiKey: 'secret' })).toBe(true);
  });

  it('rejects a wrong internal API key', () => {
    expect(isChatRequestAuthorized({ authEnabled: true, userId: null, apiKey: 'guess', internalApiKey: 'secret' })).toBe(false);
  });

  it('rejects an empty key when no internal API key is configured', () => {
    expect(isChatRequestAuthorized({ authEnabled: true, userId: null, apiKey: '', internalApiKey: '' })).toBe(false);
  });
});
