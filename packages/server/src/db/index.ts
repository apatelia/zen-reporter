import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/zen_reporter';

export const sql = postgres(connectionString, { max: 10 });
export const db = drizzle(sql, { schema });
