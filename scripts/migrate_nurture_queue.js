/**
 * Create the nurture_queue table for Slack-approval-gated outbound messages.
 *
 * Mirrors the Mpenda nurture approval flow: new opt-ins create a draft row,
 * a Slack card is posted for approval, and on approve the message is sent
 * via GHL.
 *
 * Usage: node scripts/migrate_nurture_queue.js
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
  console.log('Running PeakHer nurture_queue migration...\n');

  await sql`
    CREATE TABLE IF NOT EXISTS nurture_queue (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      first_name TEXT,
      source TEXT,
      template_key TEXT NOT NULL,
      subject TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      slack_message_ts TEXT,
      ghl_contact_id TEXT,
      approved_by TEXT,
      approved_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  + Created nurture_queue table');

  await sql`CREATE INDEX IF NOT EXISTS idx_nurture_queue_status ON nurture_queue (status)`;
  console.log('  + Created index on nurture_queue.status');

  await sql`CREATE INDEX IF NOT EXISTS idx_nurture_queue_email ON nurture_queue (email)`;
  console.log('  + Created index on nurture_queue.email');

  await sql`CREATE INDEX IF NOT EXISTS idx_nurture_queue_slack_ts ON nurture_queue (slack_message_ts) WHERE slack_message_ts IS NOT NULL`;
  console.log('  + Created index on nurture_queue.slack_message_ts');

  console.log('\n+ nurture_queue migration complete\n');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
