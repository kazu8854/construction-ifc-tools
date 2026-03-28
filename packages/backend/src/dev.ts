import { serve } from '@hono/node-server';
import app from './index';

const port = Number(process.env.PORT) || 3001;

console.log(`🚀 Backend (Hono) running at http://localhost:${port}`);
console.log(`   Mode: ${process.env.MOCK_AWS === 'true' ? '🟡 Mock (Local)' : '🟢 AWS (Real)'}`);

serve({ fetch: app.fetch, port });
