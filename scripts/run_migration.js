/**
 * Run the admin migration against the Neon database.
 * Usage: node scripts/run_migration.js
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
  console.log('Running PeakHer admin migration...\n');

  // 1. Add is_admin column
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`;
  console.log('  + Added is_admin column');

  // 2. Add last_email_sent column
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_email_sent TIMESTAMPTZ`;
  console.log('  + Added last_email_sent column');

  // 3. Add email_opt_out column
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT false`;
  console.log('  + Added email_opt_out column');

  // 4. Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users (is_admin) WHERE is_admin = true`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins (date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_streaks_current ON streaks (current_streak DESC)`;
  console.log('  + Created indexes');

  // 5. Find users and ask which to make admin
  var users = await sql`SELECT id, name, email FROM users ORDER BY created_at ASC LIMIT 20`;
  console.log('\n  Existing users:');
  users.forEach(function (u, i) {
    console.log('    ' + (i + 1) + '. ' + u.name + ' <' + u.email + '> (id: ' + u.id + ')');
  });

  // Set the first user as admin (or whoever matches Jairek's email)
  var adminUser = users.find(function (u) {
    return u.email.indexOf('jairek') > -1 || u.email.indexOf('robbins') > -1;
  });
  if (!adminUser && users.length > 0) {
    adminUser = users[0];
  }

  if (adminUser) {
    await sql`UPDATE users SET is_admin = true WHERE id = ${adminUser.id}`;
    console.log('\n  ★ Set ' + adminUser.name + ' <' + adminUser.email + '> as admin');
  } else {
    console.log('\n  ⚠ No users found. Register first, then run:');
    console.log("    UPDATE users SET is_admin = true WHERE email = 'your@email.com';");
  }

  console.log('\n✓ Migration complete!\n');
}

run().catch(function (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
