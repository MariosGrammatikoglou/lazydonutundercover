// src/lib/db.ts
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Reuse the same Pool & init promise across hot reloads (dev)
const globalForPool = globalThis as unknown as {
  pgPool?: Pool;
  pgInitPromise?: Promise<void>;
};

export const pool =
  globalForPool.pgPool ??
  new Pool({
    connectionString,
    max: 5, // small & free-tier friendly
  });

if (!globalForPool.pgPool) {
  globalForPool.pgPool = pool;
}

/**
 * Ensure the database schema exists.
 * This runs CREATE TABLE IF NOT EXISTS once (cached in pgInitPromise).
 */
export function initDb(): Promise<void> {
  if (!globalForPool.pgInitPromise) {
    globalForPool.pgInitPromise = pool
      .query(`
        CREATE TABLE IF NOT EXISTS lobbies (
          code TEXT PRIMARY KEY,
          data JSONB NOT NULL
        );
      `)
      .then(() => {
        // table ready
      })
      .catch((err) => {
        console.error('Failed to init DB', err);
        throw err;
      });
  }
  return globalForPool.pgInitPromise;
}
