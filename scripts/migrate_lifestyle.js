/**
 * Migration: Add lifestyle JSONB column to users table
 * Stores diet, training, dietary restrictions, and fasting preferences.
 *
 * Run: node scripts/migrate_lifestyle.js
 */
const { getDb } = require('../api/_lib/db');

async function migrate() {
  const sql = getDb();

  console.log('Adding lifestyle column to users table...');
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS lifestyle JSONB DEFAULT '{}'`;

  console.log('Migration complete: lifestyle column added');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
