import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({})),
}));
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(() => null),
}));
vi.mock('@/lib/deployment-mode', () => ({
  isSingleTenant: vi.fn(() => true),
}));
vi.mock('@/lib/auth/organization-handler', () => ({
  verifyUserOrganizationAccess: vi.fn(),
}));

import { GET } from './route';

describe('GET /api/documents', () => {
  it('returns a 500 error instead of an empty list when the database is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await GET(new NextRequest('http://localhost/api/documents'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to list documents');
    expect(body.documents).toBeUndefined();
  });
});
