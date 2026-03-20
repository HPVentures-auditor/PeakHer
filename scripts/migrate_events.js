/**
 * Run the events table migration against the Neon database.
 * Usage: node scripts/migrate_events.js
 *
 * Requires DATABASE_URL env var (reads from .env.local automatically).
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
  console.log('Running PeakHer events migration...\n');

  // 1. Create events table
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(30) NOT NULL,
      title VARCHAR(200) NOT NULL,
      notes TEXT,
      category VARCHAR(50),
      intensity INTEGER,
      event_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created events table');

  // 2. Create index on user_id + event_date
  await sql`CREATE INDEX IF NOT EXISTS idx_events_user_date ON events (user_id, event_date DESC)`;
  console.log('  + Created index on events(user_id, event_date)');

  // 3. Create index on user_id + type
  await sql`CREATE INDEX IF NOT EXISTS idx_events_user_type ON events (user_id, type)`;
  console.log('  + Created index on events(user_id, type)');

  console.log('\n✓ Events migration complete!\n');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
