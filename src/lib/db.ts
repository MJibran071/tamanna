/**
 * Prisma client wrapper — OOM-safe for turbopack dev mode.
 *
 * Uses require('.prisma/client') instead of require('@prisma/client'):
 * - '.prisma/client' exists in node_modules in both dev and production standalone
 * - turbopack doesn't try to resolve it through @prisma/client's CJS subpath exports
 * - Avoids the virtual module explosion that causes OOM in 4GB sandbox
 */

let _client: any = null;
let _failed = false;

function getClient(): any {
  if (_client) return _client;
  if (_failed) return null;

  try {
    const mod = require('.prisma/client');
    const PrismaClient = mod.PrismaClient;
    if (typeof PrismaClient !== 'function') {
      throw new Error('PrismaClient is not a function');
    }
    _client = new PrismaClient();
    return _client;
  } catch (err) {
    console.error('[DB] Prisma init failed:', err);
    _failed = true;
    return null;
  }
}

const globalForPrisma = globalThis as unknown as { prisma: any | null };

function getDb(): any {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = getClient();
  if (client) globalForPrisma.prisma = client;
  return client;
}

/**
 * Drop-in PrismaClient proxy.
 * Usage:
 *   import { db } from '@/lib/db';
 *   const items = await db.actionLog.findMany();
 */
export const db = new Proxy({} as any, {
  get(_target, prop) {
    const client = getDb();
    if (!client) {
      if (prop === 'then') return undefined;
      if (prop === Symbol.toStringTag) return 'PrismaClient';
      return () => Promise.resolve([]);
    }
    const value = (client as any)[prop];
    if (typeof value === 'function') return value.bind(client);
    return value;
  },
  has(_target, prop) {
    const client = getDb();
    return client ? prop in client : false;
  },
});
