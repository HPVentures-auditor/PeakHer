/**
 * Wearable integration migration -- adds wearable_connections and wearable_data tables.
 * Usage: node scripts/migrate_wearables.js
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
  console.log('Running PeakHer wearable integration migration...\n');

  // 1. Wearable connections (OAuth tokens + sync state for each provider)
  await sql`
    CREATE TABLE IF NOT EXISTS wearable_connections (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(30) NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TIMESTAMPTZ,
      oauth_token_secret TEXT,
      provider_user_id VARCHAR(200),
      scopes TEXT,
      last_synced TIMESTAMPTZ,
      sync_status VARCHAR(30) NOT NULL DEFAULT 'pending',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, provider)
    )
  `;
  console.log('  + Created wearable_connections table');

  // 2. Wearable data -- normalized daily health metrics from any provider
  await sql`
    CREATE TABLE IF NOT EXISTS wearable_data (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(30) NOT NULL,
      date DATE NOT NULL,
      hrv_avg REAL,
      hrv_max REAL,
      resting_hr REAL,
      sleep_duration_min REAL,
      sleep_quality_score REAL,
      deep_sleep_min REAL,
      rem_sleep_min REAL,
      light_sleep_min REAL,
      awake_min REAL,
      sleep_efficiency REAL,
      recovery_score REAL,
      readiness_score REAL,
      strain_score REAL,
      stress_avg REAL,
      body_battery_start INTEGER,
      body_battery_end INTEGER,
      steps INTEGER,
      calories_active REAL,
      calories_total REAL,
      skin_temp_deviation REAL,
      respiratory_rate REAL,
      spo2_avg REAL,
      active_minutes INTEGER,
      raw_data JSONB DEFAULT '{}',
      synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, provider, date)
    )
  `;
  console.log('  + Created wearable_data table');

  // 3. Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_wearable_conn_user ON wearable_connections (user_id)`;
  console.log('  + Created index on wearable_connections(user_id)');

  await sql`CREATE INDEX IF NOT EXISTS idx_wearable_data_user_date ON wearable_data (user_id, date DESC)`;
  console.log('  + Created index on wearable_data(user_id, date)');

  await sql`CREATE INDEX IF NOT EXISTS idx_wearable_data_provider ON wearable_data (user_id, provider, date DESC)`;
  console.log('  + Created index on wearable_data(user_id, provider, date)');

  console.log('\nDone! Wearable tables created.\n');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
