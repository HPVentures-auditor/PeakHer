/**
 * PeakHer: Onboarding V2 Migration
 * Adds cycle_date_confidence to cycle_profiles and coach_voice to users.
 *
 * Safe to re-run: uses IF NOT EXISTS / column existence checks.
 *
 * Usage: node scripts/migrate_onboarding_v2.js
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
  console.log('Running PeakHer Onboarding V2 migration...\n');

  // 1. Add cycle_date_confidence column to cycle_profiles
  await sql`ALTER TABLE cycle_profiles ADD COLUMN IF NOT EXISTS cycle_date_confidence TEXT DEFAULT 'exact'`;
  console.log('  + Added cycle_date_confidence column to cycle_profiles');

  // 2. Add coach_voice column to users
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_voice TEXT DEFAULT 'sassy'`;
  console.log('  + Added coach_voice column to users');

  console.log('\n  Done! New columns:');
  console.log('    cycle_profiles.cycle_date_confidence  TEXT  DEFAULT \'exact\'   (values: exact, estimated)');
  console.log('    users.coach_voice                     TEXT  DEFAULT \'sassy\'   (values: sassy, scientific, spiritual, hype)');
  console.log('\n  Migration complete!\n');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
