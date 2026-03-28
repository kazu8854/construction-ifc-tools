import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { cors } from 'hono/cors';
import { filesApp } from './api/files';
import { usersApp } from './api/users';
import { aiGenerateApp } from './api/ai-generate';
import { graphQaApp } from './api/graph-qa';

const isMock = process.env.MOCK_AWS === 'true';

// --- Global Hono Application ---
const app = new Hono();

// Enable CORS for frontend communication
app.use('*', cors());

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', mock: isMock });
});

// --- Domain Routing ---
// Add new domains here by:
// 1. Creating src/api/<domain>.ts (follow files.ts pattern)
// 2. Mounting with app.route('/api/<domain>', domainApp)
// 3. Chain must be on `routes` variable below for Hono RPC type export
const routes = app
  .route('/api/files', filesApp)
  .route('/api/users', usersApp)
  .route('/api/ai', aiGenerateApp)
  .route('/api/graph', graphQaApp);

// --- Export AppType for Frontend RPC ---
export type AppType = typeof routes;

// --- Lambda Handler ---
export const handler = handle(app);

// For local development via @hono/node-server
export default app;
