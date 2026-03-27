/**
 * Run the insights table migration against the Neon database.
 * Usage: node scripts/migrate_insights.js
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
  console.log('Running PeakHer insights migration...\n');

  // 1. Create insights table
  await sql`
    CREATE TABLE IF NOT EXISTS insights (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pattern_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
      week_ahead_narrative JSONB NOT NULL DEFAULT '{}'::jsonb,
      recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
      model_used VARCHAR(100),
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id)
    )
  `;
  console.log('  + Created insights table');

  // 2. Create index on user_id
  await sql`CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights (user_id)`;
  console.log('  + Created index on insights.user_id');

  // 3. Create index on generated_at for cache queries
  await sql`CREATE INDEX IF NOT EXISTS idx_insights_generated_at ON insights (user_id, generated_at DESC)`;
  console.log('  + Created index on insights.generated_at');

  console.log('\n✓ Insights migration complete!\n');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
