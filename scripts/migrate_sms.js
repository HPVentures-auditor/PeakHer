/**
 * PeakHer SMS Migration
 *
 * Adds SMS-related columns to the users table and creates
 * an sms_verification_codes table for OTP verification.
 *
 * Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
 *
 * Usage: node scripts/migrate_sms.js
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
  console.log('Running PeakHer SMS migration...\n');

  // 1. Add SMS columns to users table
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT`;
  console.log('  + Added phone_number column');

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false`;
  console.log('  + Added phone_verified column');

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT false`;
  console.log('  + Added sms_enabled column');

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_briefing_time TEXT NOT NULL DEFAULT '08:00'`;
  console.log('  + Added sms_briefing_time column');

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_timezone TEXT NOT NULL DEFAULT 'America/New_York'`;
  console.log('  + Added sms_timezone column');

  // 2. Create unique index on phone_number (partial, only non-null)
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users (phone_number) WHERE phone_number IS NOT NULL`;
  console.log('  + Created unique partial index on users(phone_number)');

  // 3. Create index for SMS-enabled users (for cron queries)
  await sql`CREATE INDEX IF NOT EXISTS idx_users_sms_enabled ON users (sms_enabled) WHERE sms_enabled = true`;
  console.log('  + Created index on users(sms_enabled)');

  // 4. Create sms_verification_codes table for OTP
  await sql`
    CREATE TABLE IF NOT EXISTS sms_verification_codes (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone_number TEXT NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      verified BOOLEAN NOT NULL DEFAULT false,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created sms_verification_codes table');

  await sql`CREATE INDEX IF NOT EXISTS idx_sms_codes_user ON sms_verification_codes (user_id, created_at DESC)`;
  console.log('  + Created index on sms_verification_codes(user_id)');

  // 5. Create sms_conversation_state table for tracking multi-step SMS check-in flows
  await sql`
    CREATE TABLE IF NOT EXISTS sms_conversation_state (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      state VARCHAR(30) NOT NULL DEFAULT 'idle',
      pending_data JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created sms_conversation_state table');

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_conv_user ON sms_conversation_state (user_id)`;
  console.log('  + Created unique index on sms_conversation_state(user_id)');

  // 6. Create sms_log table for debugging/tracking sends
  await sql`
    CREATE TABLE IF NOT EXISTS sms_log (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID,
      phone_number TEXT NOT NULL,
      direction VARCHAR(10) NOT NULL DEFAULT 'outbound',
      message_sid TEXT,
      body TEXT,
      status VARCHAR(30),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created sms_log table');

  await sql`CREATE INDEX IF NOT EXISTS idx_sms_log_user ON sms_log (user_id, created_at DESC)`;
  console.log('  + Created index on sms_log(user_id)');

  console.log('\nSMS migration complete!\n');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
