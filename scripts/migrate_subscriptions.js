/**
 * Run the subscriptions table migration against the Neon database.
 * Usage: node scripts/migrate_subscriptions.js
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
  console.log('Running PeakHer subscriptions migration...\n');

  // 1. Create subscriptions table
  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stripe_customer_id VARCHAR(100),
      stripe_subscription_id VARCHAR(100),
      stripe_price_id VARCHAR(100),
      plan VARCHAR(30) NOT NULL DEFAULT 'free',
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN DEFAULT false,
      founding_member BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created subscriptions table');

  // 2. Create unique index on user_id
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_user ON subscriptions (user_id)`;
  console.log('  + Created unique index on subscriptions.user_id');

  // 3. Create index on stripe_customer_id
  await sql`CREATE INDEX IF NOT EXISTS idx_sub_stripe_customer ON subscriptions (stripe_customer_id)`;
  console.log('  + Created index on subscriptions.stripe_customer_id');

  // 4. Create index on stripe_subscription_id
  await sql`CREATE INDEX IF NOT EXISTS idx_sub_stripe_sub ON subscriptions (stripe_subscription_id)`;
  console.log('  + Created index on subscriptions.stripe_subscription_id');

  // 5. Add plan column to users table
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(30) NOT NULL DEFAULT 'free'`;
  console.log('  + Added plan column to users table');

  console.log('\n✓ Subscriptions migration complete!\n');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
