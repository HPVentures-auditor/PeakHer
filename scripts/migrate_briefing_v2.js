/**
 * PeakHer Briefing v2 Migration
 * Adds coach_voice and cycle_date_confidence columns to cycle_profiles.
 *
 * Usage: node scripts/migrate_briefing_v2.js
 *
 * Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
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
  console.log('Running PeakHer Briefing v2 migration...\n');

  // 1. Add coach_voice column to cycle_profiles
  //    Valid values: 'sassy', 'scientific', 'spiritual', 'hype'
  //    Default: 'sassy'
  await sql`
    ALTER TABLE cycle_profiles
    ADD COLUMN IF NOT EXISTS coach_voice VARCHAR(20) DEFAULT 'sassy'
  `;
  console.log('  + Added coach_voice column to cycle_profiles (default: sassy)');

  // 2. Add cycle_date_confidence column to cycle_profiles
  //    Valid values: 'exact', 'estimated'
  //    Default: 'estimated'
  await sql`
    ALTER TABLE cycle_profiles
    ADD COLUMN IF NOT EXISTS cycle_date_confidence VARCHAR(20) DEFAULT 'estimated'
  `;
  console.log('  + Added cycle_date_confidence column to cycle_profiles (default: estimated)');

  console.log('\n\u2713 Briefing v2 migration complete!');
  console.log('\nNew columns:');
  console.log('  cycle_profiles.coach_voice       - sassy | scientific | spiritual | hype');
  console.log('  cycle_profiles.cycle_date_confidence - exact | estimated');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
