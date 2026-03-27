/**
 * PeakHer — Base schema initialization.
 * Creates the foundational tables that ALL other migrations depend on:
 *   users, checkins, cycle_profiles, streaks
 *
 * Safe to re-run: uses IF NOT EXISTS throughout.
 *
 * Usage: node scripts/00_init_schema.js
 */

// Load env vars from .env.local
var fs = require('fs');
var path = require('path');
var envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  var lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(function (line) {
    var match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      var val = match[2].trim();
      if ((val[0] === '"' && val[val.length - 1] === '"') || (val[0] === "'" && val[val.length - 1] === "'")) {
        val = val.slice(1, -1);
      }
      process.env[match[1].trim()] = val;
    }
  });
}

var { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set. Check .env.local');
  process.exit(1);
}

var sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log('Running PeakHer base schema initialization...\n');

  // ── 1. Enable uuid-ossp extension ─────────────────────────────────
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  console.log('  + Enabled uuid-ossp extension');

  // ── 2. Users table ────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(200) NOT NULL,
      email VARCHAR(320) NOT NULL UNIQUE,
      password_hash VARCHAR(200) NOT NULL,
      personas JSONB DEFAULT '[]'::jsonb,
      onboarding_complete BOOLEAN NOT NULL DEFAULT false,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      email_opt_out BOOLEAN NOT NULL DEFAULT false,
      last_email_sent TIMESTAMPTZ,
      plan VARCHAR(30) NOT NULL DEFAULT 'free',
      reset_token TEXT,
      reset_token_expires TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created users table');

  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`;
  console.log('  + Created index on users(email)');

  // ── 3. Cycle profiles table ───────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS cycle_profiles (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tracking_enabled BOOLEAN NOT NULL DEFAULT false,
      average_cycle_length INTEGER DEFAULT 28,
      last_period_start DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created cycle_profiles table');

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_cycle_profiles_user ON cycle_profiles (user_id)`;
  console.log('  + Created unique index on cycle_profiles(user_id)');

  // ── 4. Streaks table ──────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS streaks (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_checkin_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created streaks table');

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_streaks_user ON streaks (user_id)`;
  console.log('  + Created unique index on streaks(user_id)');

  // ── 5. Checkins table ─────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS checkins (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      energy INTEGER NOT NULL,
      confidence INTEGER NOT NULL,
      sleep_quality INTEGER,
      stress_level INTEGER,
      cycle_day INTEGER,
      cycle_phase VARCHAR(30),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created checkins table');

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins (user_id, date)`;
  console.log('  + Created unique index on checkins(user_id, date)');

  await sql`CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins (date DESC)`;
  console.log('  + Created index on checkins(date)');

  console.log('\n✓ Base schema initialization complete!\n');
  console.log('Next steps:');
  console.log('  node scripts/migrate_events.js');
  console.log('  node scripts/migrate_insights.js');
  console.log('  node scripts/migrate_subscriptions.js');
  console.log('  node scripts/migrate_push_subscriptions.js');
  console.log('  node scripts/migrate_waitlist.js');
  console.log('  node scripts/migrate_activity_log.js');
  console.log('  node scripts/run_migration.js  (admin columns)');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
