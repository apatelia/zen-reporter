import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ensureDefaultTenant, authMiddleware } from './services/auth.js';
import { runsRouter } from './routes/runs.js';
import { storage } from './services/storage.js';
import type { Env } from './types.js';

const app = new Hono<Env>();

// Global middlewares
app.use('*', logger());
app.use('*', cors());

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Authenticated API routes
const api = new Hono<Env>();
api.use('*', authMiddleware);
api.route('/runs', runsRouter);

app.route('/api/v1', api);

const PORT = parseInt(process.env.PORT || '3000', 10);

async function bootstrap() {
  // 1. Ensure default tenant and API key exist for local dev
  if (process.env.NODE_ENV !== 'production') {
    const devAuth = await ensureDefaultTenant();
    if (devAuth.apiKey) {
      console.log(`[zen-server] Ready. Tenant: ${devAuth.tenantId}, API Key: ${devAuth.apiKey}`);
    }
  }

  // 2. Ensure cloud storage bucket / container exists
  await storage.ensureContainerExists();

  // 3. Start server
  serve({
    fetch: app.fetch,
    port: PORT,
  });
  console.log(`[zen-server] Listening on http://localhost:${PORT}`);
}

bootstrap().catch((err) => {
  console.error('[zen-server] Startup error:', err);
  process.exit(1);
});

export default app;
