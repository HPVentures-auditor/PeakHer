/**
 * Calendar integration migration — adds calendar_events and calendar_connections tables.
 * Usage: node scripts/migrate_calendar.js
 *
 * Requires DATABASE_URL env var (reads from .env.local automatically).
 */

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
  console.log('Running PeakHer calendar migration...\n');

  // 1. Calendar connections (OAuth tokens + sync state)
  await sql`
    CREATE TABLE IF NOT EXISTS calendar_connections (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(30) NOT NULL DEFAULT 'google',
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TIMESTAMPTZ,
      calendar_id VARCHAR(200) DEFAULT 'primary',
      sync_token TEXT,
      last_synced TIMESTAMPTZ,
      sync_status VARCHAR(30) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, provider)
    )
  `;
  console.log('  + Created calendar_connections table');

  // 2. Calendar events (synced from external calendars or manual)
  await sql`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      external_id TEXT,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ,
      is_all_day BOOLEAN NOT NULL DEFAULT false,
      event_type VARCHAR(50) DEFAULT 'meeting',
      estimated_importance INTEGER DEFAULT 5,
      attendee_count INTEGER DEFAULT 1,
      location TEXT,
      synced_from VARCHAR(30) DEFAULT 'manual',
      raw_data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created calendar_events table');

  // 3. Indexes for fast lookups
  await sql`CREATE INDEX IF NOT EXISTS idx_cal_conn_user ON calendar_connections (user_id)`;
  console.log('  + Created index on calendar_connections(user_id)');

  await sql`CREATE INDEX IF NOT EXISTS idx_cal_events_user_time ON calendar_events (user_id, start_time)`;
  console.log('  + Created index on calendar_events(user_id, start_time)');

  // start_time index already covers date range queries; skip expression index
  console.log('  + (start_time index covers date range queries)');

  await sql`CREATE INDEX IF NOT EXISTS idx_cal_events_external ON calendar_events (user_id, external_id) WHERE external_id IS NOT NULL`;
  console.log('  + Created index on calendar_events(user_id, external_id)');

  console.log('\n✓ Calendar migration complete!\n');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
