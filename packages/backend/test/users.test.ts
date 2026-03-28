import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';

describe('Users API (Integration Test via Hono)', () => {
  it('GET /api/health returns ok', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('ok');
  });

  it('POST /api/users creates a user', async () => {
    const res = await app.request('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Setup User',
        email: 'test@example.com'
      })
    });
    
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('id');
    expect(body.data.name).toBe('Test Setup User');
  });

  it('GET /api/users/:id finds the created user', async () => {
    // 1. Create a user
    const createRes = await app.request('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Find Me', email: 'findme@example.com' })
    });
    const createBody = await createRes.json() as any;
    const userId = createBody.data.id;

    // 2. Fetch the user
    const getRes = await app.request(`/api/users/${userId}`);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json() as any;
    
    expect(getBody.success).toBe(true);
    expect(getBody.data.id).toBe(userId);
    expect(getBody.data.name).toBe('Find Me');
  });

  it('GET /api/users/:id returns 404 for missing user', async () => {
    const res = await app.request('/api/users/not-found');
    expect(res.status).toBe(404);
  });
});
