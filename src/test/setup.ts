import dotenv from 'dotenv';
import path from 'path';

// Force .env.test environment
dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

import db from '../database/connection';

export async function setup() {
  // Wipe and rerun all migrations from scratch for clean state
  await db.migrate.rollback(undefined, true);
  await db.migrate.latest();
}

export async function teardown() {
  await db.destroy(); // Closes connection pool so Vitest can exit cleanly
}