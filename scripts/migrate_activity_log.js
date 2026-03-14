/**
 * Create the admin_activity_log table.
 * Usage: node scripts/migrate_activity_log.js
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
      // Strip surrounding quotes
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
  console.log('Running admin_activity_log migration...\n');

  // 1. Create the table
  await sql`
    CREATE TABLE IF NOT EXISTS admin_activity_log (
      id BIGSERIAL PRIMARY KEY,
      admin_id UUID REFERENCES users(id),
      action VARCHAR(50) NOT NULL,
      target_type VARCHAR(30),
      target_id TEXT,
      target_label TEXT,
      details TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('  + Created admin_activity_log table');

  // 2. Create index for fast time-ordered queries
  await sql`CREATE INDEX IF NOT EXISTS idx_activity_log_created ON admin_activity_log (created_at DESC)`;
  console.log('  + Created idx_activity_log_created index');

  console.log('\n✓ Migration complete!\n');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
