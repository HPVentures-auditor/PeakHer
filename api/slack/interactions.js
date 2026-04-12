/**
 * POST /api/slack/interactions
 *
 * Slack interactivity webhook. Receives button click payloads for PeakHer
 * nurture approval cards posted to Slack.
 *
 * Expected actions (one per card):
 *   - approve_msg_<id>  -> mark the nurture_queue row approved, send via GHL,
 *                          update the Slack card to show "Sent by <user>"
 *   - reject_msg_<id>   -> mark the row rejected, update the Slack card
 *
 * Security: Slack signs every request with HMAC-SHA256 using the app's
 * signing secret. We verify against the raw request body.
 *
 * Config this URL in Slack app settings > Interactivity & Shortcuts:
 *   Request URL: https://peakher.ai/api/slack/interactions
 */

var { getDb } = require('../_lib/db');
var ghl = require('../_lib/ghl');
var slackApproval = require('../_lib/slack-approval');

// Disable Vercel body parsing so we can read raw body for signature verification
module.exports.config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (chunk) { chunks.push(chunk); });
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

function parseFormUrlEncoded(raw) {
  var out = {};
  if (!raw) return out;
  var parts = raw.split('&');
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    var eq = p.indexOf('=');
    if (eq === -1) continue;
    var k = decodeURIComponent(p.slice(0, eq).replace(/\+/g, ' '));
    var v = decodeURIComponent(p.slice(eq + 1).replace(/\+/g, ' '));
    out[k] = v;
  }
  return out;
}

async function loadMessage(sql, id) {
  var rows = await sql`SELECT * FROM nurture_queue WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

async function handleApprove(sql, msgId, userName) {
  var msg = await loadMessage(sql, msgId);
  if (!msg) {
    return { ok: false, error: 'Message not found' };
  }
  if (msg.status !== 'draft') {
    // Idempotent: return current state, update card to reflect reality
    await slackApproval.updateApprovalCard(msg, msg.status);
    return { ok: true, stale: true, status: msg.status };
  }

  // Mark approved first so retries don't double-send
  var approvedAt = new Date().toISOString();
  await sql`
    UPDATE nurture_queue
    SET status = 'approved', approved_by = ${userName}, approved_at = ${approvedAt}
    WHERE id = ${msgId} AND status = 'draft'
  `;

  // Ensure we have a GHL contact id (create if missing)
  var contactId = msg.ghl_contact_id;
  if (!contactId) {
    var existing = await ghl.findContactByEmail(msg.email);
    if (existing) {
      contactId = existing.id;
    } else {
      var created = await ghl.upsertContact({
        email: msg.email,
        firstName: msg.first_name || '',
        tags: ['peakher_waitlist'],
        source: msg.source || 'PeakHer Waitlist'
      });
      if (created && created.id) {
        contactId = created.id;
      }
    }
    if (contactId) {
      await sql`UPDATE nurture_queue SET ghl_contact_id = ${contactId} WHERE id = ${msgId}`;
    }
  }

  if (!contactId) {
    await sql`
      UPDATE nurture_queue
      SET status = 'failed', error = ${'Could not resolve GHL contact for ' + msg.email}
      WHERE id = ${msgId}
    `;
    var failed = await loadMessage(sql, msgId);
    await slackApproval.updateApprovalCard(failed, 'failed');
    return { ok: false, error: 'Could not resolve GHL contact' };
  }

  // Send via GHL
  try {
    await ghl.sendEmail(contactId, msg.subject || '', msg.body);
    var sentAt = new Date().toISOString();
    await sql`UPDATE nurture_queue SET status = 'sent', sent_at = ${sentAt} WHERE id = ${msgId}`;
    var sent = await loadMessage(sql, msgId);
    await slackApproval.updateApprovalCard(sent, 'sent');
    return { ok: true, status: 'sent' };
  } catch (err) {
    var errMsg = (err && err.message) ? err.message : 'Send failed';
    await sql`UPDATE nurture_queue SET status = 'failed', error = ${errMsg} WHERE id = ${msgId}`;
    var failedSend = await loadMessage(sql, msgId);
    await slackApproval.updateApprovalCard(failedSend, 'failed');
    console.error('Nurture send failed for msg', msgId, errMsg);
    return { ok: false, error: errMsg };
  }
}

async function handleReject(sql, msgId, userName) {
  var msg = await loadMessage(sql, msgId);
  if (!msg) return { ok: false, error: 'Message not found' };
  if (msg.status !== 'draft') {
    await slackApproval.updateApprovalCard(msg, msg.status);
    return { ok: true, stale: true, status: msg.status };
  }

  await sql`
    UPDATE nurture_queue
    SET status = 'rejected', approved_by = ${userName}, approved_at = ${new Date().toISOString()}
    WHERE id = ${msgId} AND status = 'draft'
  `;
  var rejected = await loadMessage(sql, msgId);
  await slackApproval.updateApprovalCard(rejected, 'rejected');
  return { ok: true, status: 'rejected' };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read raw body for signature verification
  var rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error('Slack interactions: failed to read body', err.message);
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  var timestamp = req.headers['x-slack-request-timestamp'];
  var signature = req.headers['x-slack-signature'];

  if (!slackApproval.verifySlackSignature(rawBody, timestamp, signature)) {
    console.warn('Slack interactions: signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Slack sends the payload as form-encoded: "payload=<json>"
  var form = parseFormUrlEncoded(rawBody);
  if (!form.payload) {
    return res.status(400).json({ error: 'Missing payload' });
  }

  var payload;
  try {
    payload = JSON.parse(form.payload);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid payload JSON' });
  }

  if (payload.type !== 'block_actions') {
    // We only handle button clicks for now
    return res.status(200).json({ ok: true });
  }

  var actions = payload.actions || [];
  if (actions.length === 0) {
    return res.status(200).json({ ok: true });
  }

  var action = actions[0];
  var actionId = action.action_id || '';
  var user = payload.user || {};
  var userName = user.username || user.name || user.id || 'unknown';

  var sql = getDb();

  // Respond to Slack quickly (within 3s). We do the work inline here because
  // GHL send is fast and the response body is ignored; card updates happen
  // via chat.update regardless.
  try {
    if (actionId.indexOf('approve_msg_') === 0) {
      var approveId = parseInt(actionId.slice('approve_msg_'.length), 10);
      if (!Number.isFinite(approveId)) {
        return res.status(200).json({ ok: true });
      }
      await handleApprove(sql, approveId, userName);
      return res.status(200).json({ ok: true });
    }

    if (actionId.indexOf('reject_msg_') === 0) {
      var rejectId = parseInt(actionId.slice('reject_msg_'.length), 10);
      if (!Number.isFinite(rejectId)) {
        return res.status(200).json({ ok: true });
      }
      await handleReject(sql, rejectId, userName);
      return res.status(200).json({ ok: true });
    }

    // Unknown action id — acknowledge so Slack doesn't retry
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Slack interactions handler error:', err && err.message ? err.message : err);
    // Always ack to prevent Slack retry storm
    return res.status(200).json({ ok: true });
  }
};
