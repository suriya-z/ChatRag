import { describe, it, expect } from 'vitest';
import { isDemoLoginAllowed } from './demo-mode';

describe('isDemoLoginAllowed', () => {
  it('blocks demo login in production by default', () => {
    expect(isDemoLoginAllowed({ NODE_ENV: 'production' })).toBe(false);
  });

  it('allows demo login in development', () => {
    expect(isDemoLoginAllowed({ NODE_ENV: 'development' })).toBe(true);
  });

  it('allows demo login in production when NEXT_PUBLIC_DEMO_MODE is true', () => {
    expect(isDemoLoginAllowed({ NODE_ENV: 'production', NEXT_PUBLIC_DEMO_MODE: 'true' })).toBe(true);
  });

  it('treats any value other than "true" as off', () => {
    expect(isDemoLoginAllowed({ NODE_ENV: 'production', NEXT_PUBLIC_DEMO_MODE: '1' })).toBe(false);
  });
});
