import { hc } from 'hono/client';
import type { AppType } from '@construction-ifc-tools/backend';

/**
 * Hono API のベース URL。
 * - `VITE_API_URL` があれば最優先（本番など）
 * - `VITE_MOCK_AWS=true` のときは直接 localhost:3001（CORS 経由）
 * - それ以外の開発時は空文字 → 相対 `/api/*`（Vite の proxy が 3001 へ転送）
 */
function resolveBackendUrl(): string {
  const explicit = import.meta.env.VITE_API_URL as string | undefined;
  if (explicit?.trim()) return explicit.replace(/\/$/, '');
  if (import.meta.env.VITE_MOCK_AWS === 'true') return 'http://localhost:3001';
  if (import.meta.env.DEV) return '';
  return '';
}

export const BACKEND_URL = resolveBackendUrl();

// Create the Hono RPC Client.
// This gives you end-to-end type safety across the entire monorepo!
// Example usage: 
// const res = await client.api.users.$post({ json: { ... } });
export const client = hc<AppType>(BACKEND_URL);
