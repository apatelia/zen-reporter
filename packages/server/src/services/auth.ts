import crypto from 'node:crypto';
import type { Context, Next } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { apiKeys, tenants } from '../db/schema.js';
import type { Env } from '../types.js';

/**
 * Generates a SHA-256 hash from a plaintext API key.
 *
 * @param key - Plaintext API key.
 * @returns Hex-encoded SHA-256 hash string.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Ensures a default development tenant and API key exist in non-production environments.
 *
 * @returns Tenant ID and development API key.
 */
export async function ensureDefaultTenant(): Promise<{ tenantId: string; apiKey: string }> {
  // Never seed development credentials in production environment
  if (process.env.NODE_ENV === 'production') {
    return { tenantId: '', apiKey: '' };
  }

  const defaultTenantId = 'default-tenant';
  const rawKey = process.env.ZEN_DEV_API_KEY || 'zr_live_dev_api_key_12345';
  const hashed = hashApiKey(rawKey);

  const existingTenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, defaultTenantId),
  });

  if (!existingTenant) {
    await db.insert(tenants).values({
      id: defaultTenantId,
      name: 'Default Organization',
    });
  }

  const existingKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, hashed),
  });

  if (!existingKey) {
    await db.insert(apiKeys).values({
      id: 'default-dev-key',
      tenantId: defaultTenantId,
      keyHash: hashed,
      name: 'Development Master Key',
    });
  }

  return { tenantId: defaultTenantId, apiKey: rawKey };
}

/**
 * Authentication middleware resolving Tenant ID from Bearer token or X-API-Key header.
 *
 * @param c - Hono context object containing request information.
 * @param next - Hono next middleware function.
 * @returns Response object or passes control to next middleware.
 */
export async function authMiddleware(c: Context<Env>, next: Next) {
  const authHeader = c.req.header('Authorization') || c.req.header('X-API-Key');
  if (!authHeader) {
    return c.json(
      { error: 'Missing API key header (Authorization: Bearer <key> or X-API-Key)' },
      401
    );
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  const keyHash = hashApiKey(token);

  const matchedKey = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.revoked, false)),
  });

  if (!matchedKey) {
    return c.json({ error: 'Invalid or revoked API key' }, 403);
  }

  // Throttle lastUsedAt updates: only update if not updated within the last 5 minutes
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  if (!matchedKey.lastUsedAt || matchedKey.lastUsedAt < fiveMinutesAgo) {
    db.update(apiKeys)
      .set({ lastUsedAt: now })
      .where(eq(apiKeys.id, matchedKey.id))
      .catch(() => {});
  }

  // Store tenant context
  c.set('tenantId', matchedKey.tenantId);
  await next();
}
