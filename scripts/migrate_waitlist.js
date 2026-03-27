/**
 * Create the waitlist table for tracking beta signups locally.
 * Usage: node scripts/migrate_waitlist.js
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
  console.log('Running PeakHer waitlist migration...\n');

  await sql`
    CREATE TABLE IF NOT EXISTS waitlist (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      role VARCHAR(50),
      source VARCHAR(50) DEFAULT 'landing',
      quiz_score INTEGER,
      quiz_level VARCHAR(50),
      invited_at TIMESTAMPTZ,
      registered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(email)
    )
  `;
  console.log('  + Created waitlist table');

  await sql`CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist (email)`;
  console.log('  + Created index on waitlist.email');

  await sql`CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist (created_at)`;
  console.log('  + Created index on waitlist.created_at');

  await sql`CREATE INDEX IF NOT EXISTS idx_waitlist_invited ON waitlist (invited_at) WHERE invited_at IS NULL`;
  console.log('  + Created partial index for uninvited entries');

  console.log('\n✓ Waitlist migration complete!\n');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
