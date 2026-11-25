import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
}));

import { GET } from './route';

describe('GET /api/config/connectors', () => {
  it('returns a 500 error instead of a disabled config when Supabase is not reachable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await GET(new NextRequest('http://localhost/api/config/connectors'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch connector configuration');
  });
});
