/**
 * Backfill missing GHL contacts for PeakHer users.
 *
 * Context: api/auth/register.js used fire-and-forget promises to create the
 * GHL contact on signup. On Vercel serverless, those promises get dropped
 * when the function terminates after the response is sent, so some real
 * signups never made it into GHL. This script walks every user in the DB,
 * checks GHL by email, and creates the contact if missing.
 *
 * Also (optionally) sends the welcome email for users who missed it. Pass
 * --send-welcome to enable. Without the flag, only GHL contacts are healed.
 *
 * Usage:
 *   node scripts/backfill_ghl.js            # dry run: list who's missing
 *   node scripts/backfill_ghl.js --apply    # create missing contacts in GHL
 *   node scripts/backfill_ghl.js --apply --send-welcome
 */

var path = require('path');
var fs = require('fs');

// Load env from .env.production (no dotenv dependency)
var envPath = path.join(__dirname, '..', '.env.production');
if (fs.existsSync(envPath)) {
  var content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(function (line) {
    var m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) {
      var v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  });
}

var { neon } = require('@neondatabase/serverless');

var APPLY = process.argv.includes('--apply');
var SEND_WELCOME = process.argv.includes('--send-welcome');
var GHL_API_KEY = process.env.GHL_PEAKHER_API_KEY;
var GHL_LOCATION_ID = process.env.GHL_PEAKHER_LOCATION_ID;
var GHL_BASE = 'https://services.leadconnectorhq.com';

function ghlHeaders() {
  return {
    'Authorization': 'Bearer ' + GHL_API_KEY,
    'Content-Type': 'application/json',
    'Version': '2021-07-28'
  };
}

async function findContact(email) {
  var url = GHL_BASE + '/contacts/search/duplicate?locationId=' + GHL_LOCATION_ID + '&email=' + encodeURIComponent(email);
  var resp = await fetch(url, { headers: ghlHeaders() });
  if (!resp.ok) {
    console.warn('  findContact failed for', email, resp.status);
    return null;
  }
  var data = await resp.json();
  return (data.contact && data.contact.id) ? data.contact : null;
}

async function createContact(user) {
  var firstName = (user.name || '').split(' ')[0] || '';
  var body = {
    locationId: GHL_LOCATION_ID,
    email: user.email,
    firstName: firstName,
    tags: ['peakher_user', 'registered', 'backfilled'],
    source: 'PeakHer Registration (backfill)'
  };
  var resp = await fetch(GHL_BASE + '/contacts/', {
    method: 'POST',
    headers: ghlHeaders(),
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    var text = await resp.text();
    return { ok: false, error: resp.status + ' ' + text.slice(0, 200) };
  }
  var data = await resp.json();
  var contact = data.contact || data;
  return { ok: true, id: contact.id };
}

function welcomeEmailHtml(name) {
  var safe = (name || '').replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
  });
  return {
    subject: 'Welcome to PeakHer, ' + name + '!',
    html: '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
      '<body style="margin:0;padding:0;background:#0a1628;font-family:Inter,-apple-system,sans-serif;">' +
      '<div style="max-width:560px;margin:0 auto;padding:40px 24px;">' +
      '<div style="text-align:center;margin-bottom:32px;"><span style="font-size:15px;font-weight:800;letter-spacing:4px;color:#2d8a8a;text-transform:uppercase;">PEAKHER</span></div>' +
      '<div style="background:#0f2035;border-radius:12px;padding:32px 24px;border:1px solid rgba(255,255,255,0.06);">' +
      '<h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 12px;">Welcome, ' + safe + '!</h1>' +
      '<p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 20px;">You\'re in. PeakHer tracks your energy, confidence, and daily rhythm so you can see the patterns behind your performance.</p>' +
      '<p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 24px;">Your first step: <strong style="color:#fff;">log today\'s check-in.</strong> It takes 30 seconds and starts building your performance map.</p>' +
      '<div style="text-align:center;"><a href="https://peakher.ai/app/" style="display:inline-block;background:#E87461;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Log Your First Check-in</a></div>' +
      '</div></div></body></html>'
  };
}

async function sendViaGhl(contactId, subject, html) {
  var resp = await fetch(GHL_BASE + '/conversations/messages', {
    method: 'POST',
    headers: ghlHeaders(),
    body: JSON.stringify({
      type: 'Email',
      contactId: contactId,
      subject: subject,
      html: html,
      locationId: GHL_LOCATION_ID
    })
  });
  if (!resp.ok) {
    var text = await resp.text();
    return { ok: false, error: resp.status + ' ' + text.slice(0, 200) };
  }
  return { ok: true };
}

(async function () {
  if (!process.env.DATABASE_URL || !GHL_API_KEY || !GHL_LOCATION_ID) {
    console.error('Missing DATABASE_URL / GHL_PEAKHER_API_KEY / GHL_PEAKHER_LOCATION_ID');
    process.exit(1);
  }

  console.log('Mode:', APPLY ? 'APPLY' : 'DRY RUN');
  console.log('Send welcome:', SEND_WELCOME ? 'yes' : 'no');
  console.log('');

  var sql = neon(process.env.DATABASE_URL);
  var users = await sql`
    SELECT id, name, email, created_at
    FROM users
    WHERE email IS NOT NULL
    ORDER BY created_at DESC
  `;
  console.log('Total users in DB:', users.length);

  var missing = [];
  var existing = 0;
  var errors = 0;

  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    try {
      var contact = await findContact(u.email);
      if (contact) {
        existing++;
      } else {
        missing.push(u);
        console.log('MISSING:', u.email, '(' + u.name + ', joined ' + new Date(u.created_at).toISOString().split('T')[0] + ')');
      }
    } catch (e) {
      errors++;
      console.warn('Check failed for', u.email, e.message);
    }
  }

  console.log('');
  console.log('Summary: ' + existing + ' already in GHL, ' + missing.length + ' missing, ' + errors + ' check errors');

  if (!APPLY) {
    console.log('');
    console.log('Dry run complete. Re-run with --apply to create the missing contacts.');
    process.exit(0);
  }

  console.log('');
  console.log('Creating missing contacts...');
  var created = 0;
  var createFailed = 0;
  var emailsSent = 0;
  var emailsFailed = 0;

  for (var j = 0; j < missing.length; j++) {
    var mu = missing[j];
    var result = await createContact(mu);
    if (!result.ok) {
      console.warn('  CREATE FAILED', mu.email, '->', result.error);
      createFailed++;
      continue;
    }
    created++;
    console.log('  CREATED', mu.email, '->', result.id);

    if (SEND_WELCOME) {
      var tpl = welcomeEmailHtml(mu.name || '');
      var emailResult = await sendViaGhl(result.id, tpl.subject, tpl.html);
      if (emailResult.ok) {
        emailsSent++;
        console.log('    welcome email sent');
      } else {
        emailsFailed++;
        console.warn('    welcome email FAILED:', emailResult.error);
      }
    }
  }

  console.log('');
  console.log('Done. Created:', created, '| Failed:', createFailed, '| Emails sent:', emailsSent, '| Email failures:', emailsFailed);
})().catch(function (e) {
  console.error('Fatal:', e.message);
  process.exit(1);
});
