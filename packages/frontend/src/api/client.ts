import { hc } from 'hono/client';
import type { AppType } from '@construction-ifc-tools/backend';

/** Base URL for the Hono API (RPC client and manual fetch e.g. multipart upload). */
export const BACKEND_URL = import.meta.env.VITE_MOCK_AWS === 'true'
  ? 'http://localhost:3001'
  : import.meta.env.VITE_API_URL || '';

// Create the Hono RPC Client.
// This gives you end-to-end type safety across the entire monorepo!
// Example usage: 
// const res = await client.api.users.$post({ json: { ... } });
export const client = hc<AppType>(BACKEND_URL);
