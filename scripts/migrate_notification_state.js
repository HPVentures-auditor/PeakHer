/**
 * Run the notification_state table migration against the Neon database.
 * Usage: node scripts/migrate_notification_state.js
 *
 * Tracks which notification hook was last sent to each user,
 * so morning push notifications don't repeat the same message
 * on consecutive days.
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
  console.log('Running PeakHer notification_state migration...\n');

  // 1. Create notification_state table
  await sql`
    CREATE TABLE IF NOT EXISTS notification_state (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      last_hook_index INTEGER,
      last_hook_phase TEXT,
      last_sent_at TIMESTAMPTZ
    )
  `;
  console.log('  + Created notification_state table');

  console.log('\nNotification state migration complete!\n');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
