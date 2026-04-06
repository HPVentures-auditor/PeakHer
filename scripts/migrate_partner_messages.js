/**
 * Add personal_message columns to partnerships table.
 * She can set a custom "what I need right now" message per phase.
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
      if ((val[0] === '"' && val[val.length - 1] === '"') || (val[0] === "'" && val[val.length - 1] === "'")) val = val.slice(1, -1);
      process.env[match[1].trim()] = val;
    }
  });
}

var { neon } = require('@neondatabase/serverless');

async function migrate() {
  var sql = neon(process.env.DATABASE_URL);
  console.log('Adding personal message columns...');
  await sql`ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS personal_message_restore TEXT`;
  await sql`ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS personal_message_rise TEXT`;
  await sql`ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS personal_message_peak TEXT`;
  await sql`ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS personal_message_sustain TEXT`;
  console.log('Done! 4 personal_message columns added.');
}

migrate().catch(function (err) { console.error(err); process.exit(1); });
