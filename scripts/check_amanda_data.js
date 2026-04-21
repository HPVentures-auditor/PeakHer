/**
 * check_amanda_data.js
 *
 * Diagnostic script to verify Amanda's data landed for the email brief.
 * Prints:
 *   1. candidate user rows matching amanda in users table
 *   2. today's calendar_events for that user
 *   3. last 7 days of wearable_data for that user
 *   4. calendar_connections and wearable_connections OAuth state
 *
 * Usage: node scripts/check_amanda_data.js
 */

var fs = require('fs');
var path = require('path');

// Minimal manual .env loader. We try .env.local first, then .env, then .env.production.
function loadEnvFile(p) {
  if (!fs.existsSync(p)) return false;
  var raw = fs.readFileSync(p, 'utf8');
  var lines = raw.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.charAt(0) === '#') continue;
    var eq = line.indexOf('=');
    if (eq < 1) continue;
    var key = line.slice(0, eq).trim();
    var val = line.slice(eq + 1).trim();
    if ((val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') ||
        (val.charAt(0) === "'" && val.charAt(val.length - 1) === "'")) {
      val = val.slice(1, -1);
    }
    // Strip trailing literal backslash-n that has bitten this project before.
    val = val.replace(/\\n$/, '');
    if (!process.env[key]) process.env[key] = val;
  }
  return true;
}

var repoRoot = path.resolve(__dirname, '..');
var loaded = [];
['.env.local', '.env', '.env.production'].forEach(function (name) {
  var p = path.join(repoRoot, name);
  if (loadEnvFile(p)) loaded.push(name);
});
console.log('Loaded env from:', loaded.length ? loaded.join(', ') : '(none)');

var { getDb } = require('../api/_lib/db');

function formatDate(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function addDays(dateStr, n) {
  var parts = dateStr.split('-');
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

async function tableExists(sql, tableName) {
  try {
    var rows = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
      LIMIT 1
    `;
    return rows.length > 0;
  } catch (e) {
    return false;
  }
}

async function main() {
  var sql = getDb();
  var today = formatDate(new Date());
  console.log('\n=== CHECK AMANDA DATA ===');
  console.log('Today (local):', today);

  // 1. Find candidate amanda rows.
  console.log('\n--- users table: candidates matching amanda ---');
  var candidates = await sql`
    SELECT id, name, email, created_at
    FROM users
    WHERE LOWER(email) LIKE '%amanda%'
       OR LOWER(name) LIKE '%amanda%'
    ORDER BY created_at DESC
  `;
  if (candidates.length === 0) {
    console.log('No users matching amanda. Printing first 20 users for sanity:');
    var all = await sql`SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT 20`;
    all.forEach(function (u) { console.log('  -', u.id, u.email, u.name); });
    return;
  }
  candidates.forEach(function (u) {
    console.log('  -', u.id, '|', u.email, '|', u.name, '|', u.created_at);
  });

  // Run the full check against every candidate so we do not miss the right Amanda.
  for (var ci = 0; ci < candidates.length; ci++) {
    var amanda = candidates[ci];
    console.log('\n==============================================');
    console.log('Checking user:', amanda.id, '|', amanda.email, '|', amanda.name);
    console.log('==============================================');

    // 2. Today's calendar_events.
    console.log('\n--- calendar_events for today (' + today + ') ---');
    var hasCalEvents = await tableExists(sql, 'calendar_events');
    if (!hasCalEvents) {
      console.log('  calendar_events table does not exist.');
    } else {
      var todayStart = today + 'T00:00:00Z';
      var todayEnd = today + 'T23:59:59Z';
      var events = await sql`
        SELECT title, start_time, end_time, is_all_day, event_type
        FROM calendar_events
        WHERE user_id = ${amanda.id}
          AND start_time >= ${todayStart}
          AND start_time <= ${todayEnd}
        ORDER BY start_time ASC
      `;
      console.log('  count:', events.length);
      events.forEach(function (e) {
        console.log('   -', e.start_time, '|', e.title, '| all_day=' + e.is_all_day, '| type=' + e.event_type);
      });
      var totalCal = await sql`SELECT COUNT(*)::int AS c FROM calendar_events WHERE user_id = ${amanda.id}`;
      console.log('  total calendar_events all time for this user:', totalCal[0].c);
    }

    // 3. Last 7 days wearable_data.
    console.log('\n--- wearable_data last 7 days ---');
    var hasWearable = await tableExists(sql, 'wearable_data');
    if (!hasWearable) {
      console.log('  wearable_data table does not exist.');
    } else {
      var sevenDaysAgo = addDays(today, -7);
      var wearable = await sql`
        SELECT date, provider, hrv_avg, recovery_score, readiness_score, strain_score,
               sleep_duration_min, sleep_quality_score
        FROM wearable_data
        WHERE user_id = ${amanda.id}
          AND date >= ${sevenDaysAgo}
          AND date <= ${today}
        ORDER BY date DESC
      `;
      console.log('  count:', wearable.length);
      var providers = {};
      wearable.forEach(function (w) {
        providers[w.provider] = (providers[w.provider] || 0) + 1;
        console.log('   -', w.date, '|', w.provider,
          '| sleep=' + (w.sleep_duration_min ? Math.round(w.sleep_duration_min / 60 * 10) / 10 + 'h' : 'null'),
          '| hrv=' + (w.hrv_avg || 'null'),
          '| recovery=' + (w.recovery_score != null ? w.recovery_score + '%' : 'null'),
          '| strain=' + (w.strain_score != null ? w.strain_score : 'null'));
      });
      console.log('  providers:', JSON.stringify(providers));
      var mostRecent = await sql`
        SELECT MAX(date) AS max_date FROM wearable_data WHERE user_id = ${amanda.id}
      `;
      console.log('  most recent wearable_data.date:', mostRecent[0].max_date);
    }

    // 4. OAuth connection state. Note: schema uses last_synced (not last_synced_at) and created_at (not connected_at).
    console.log('\n--- calendar_connections ---');
    var hasCalConn = await tableExists(sql, 'calendar_connections');
    if (!hasCalConn) {
      console.log('  calendar_connections table does not exist.');
    } else {
      var calConn = await sql`
        SELECT provider, created_at, last_synced, sync_status, access_token IS NOT NULL AS has_token
        FROM calendar_connections
        WHERE user_id = ${amanda.id}
      `;
      console.log('  count:', calConn.length);
      calConn.forEach(function (c) {
        console.log('   -', c.provider, '| created=' + c.created_at, '| last_synced=' + c.last_synced, '| status=' + c.sync_status, '| token=' + c.has_token);
      });
    }

    console.log('\n--- wearable_connections ---');
    var hasWearConn = await tableExists(sql, 'wearable_connections');
    if (!hasWearConn) {
      console.log('  wearable_connections table does not exist.');
    } else {
      var wConn = await sql`
        SELECT provider, created_at, last_synced, sync_status, access_token IS NOT NULL AS has_token
        FROM wearable_connections
        WHERE user_id = ${amanda.id}
      `;
      console.log('  count:', wConn.length);
      wConn.forEach(function (c) {
        console.log('   -', c.provider, '| created=' + c.created_at, '| last_synced=' + c.last_synced, '| status=' + c.sync_status, '| token=' + c.has_token);
      });
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(function (err) {
  console.error('Script error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
