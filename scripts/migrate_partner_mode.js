/**
 * PeakHer Partner Mode Migration
 *
 * Adds role column to users table, creates partnerships table
 * and partner_briefings cache table.
 *
 * Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
 *
 * Usage: node scripts/migrate_partner_mode.js
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

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  var sql = neon(process.env.DATABASE_URL);
  console.log('Running PeakHer Partner Mode migration...\n');

  // 1. Add role column to users
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'`;
  console.log('  + Added role column to users table');

  // 2. Create partnerships table
  await sql`
    CREATE TABLE IF NOT EXISTS partnerships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      primary_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      partner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      invite_code VARCHAR(12) NOT NULL,
      invite_expires_at TIMESTAMPTZ NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      sharing_paused BOOLEAN NOT NULL DEFAULT false,
      share_phase_name BOOLEAN NOT NULL DEFAULT true,
      share_energy_level BOOLEAN NOT NULL DEFAULT true,
      share_nutrition_tips BOOLEAN NOT NULL DEFAULT true,
      share_emotional_weather BOOLEAN NOT NULL DEFAULT true,
      accepted_at TIMESTAMPTZ,
      paused_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created partnerships table');

  // 3. Create indexes on partnerships
  await sql`CREATE INDEX IF NOT EXISTS idx_partnerships_primary ON partnerships (primary_user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_partnerships_partner ON partnerships (partner_user_id)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_partnerships_invite ON partnerships (invite_code) WHERE status = 'pending'`;
  console.log('  + Created indexes on partnerships');

  // 4. Create partner_briefings cache table
  await sql`
    CREATE TABLE IF NOT EXISTS partner_briefings (
      id BIGSERIAL PRIMARY KEY,
      partnership_id UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      briefing_json JSONB NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created partner_briefings table');

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_briefings_date ON partner_briefings (partnership_id, date)`;
  console.log('  + Created index on partner_briefings');

  console.log('\nDone! Partner Mode tables created.');
}

migrate().catch(function (err) {
  console.error('Migration failed:', err);
  process.exit(1);
});
