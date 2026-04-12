/**
 * POST /api/waitlist
 *
 * Stores waitlist signup locally, proxies to Mpenda/GHL to create the contact,
 * and queues a draft welcome email that posts to Slack for approval before
 * sending. This matches the HP Ventures / Mpenda pattern: no auto-sending,
 * every outbound message passes through a human approval step.
 */

var { getDb } = require('./_lib/db');
var slackApproval = require('./_lib/slack-approval');

const MPENDA_URL = 'https://mpenda-production-ecba.up.railway.app/api/ghl/waitlist';

// ---------------------------------------------------------------------------
// Dot-voice welcome template
// ---------------------------------------------------------------------------
// Kept here (rather than a separate template file) to keep the change small.
// Uses the Dot rules: lead with an action, specific, warm, direct, no em dashes.
function buildWaitlistWelcome(firstName) {
  var name = (firstName || '').trim();
  var greeting = name ? 'Hey ' + name + ',' : 'Hey there,';

  var subject = 'You\'re on the PeakHer list. Here\'s what happens next.';

  var html = [
    '<p>' + greeting + '</p>',
    '<p>You\'re officially on the PeakHer waitlist. I\'m Dot, your Hormonal Intelligence. We\'ll talk a lot.</p>',
    '<p><strong>What happens next:</strong></p>',
    '<ul>',
    '<li>I\'ll send one short note each week so your brain starts to recognize the pattern before the app does.</li>',
    '<li>When your spot opens, you\'ll get a direct invite with a founding-member link. No "join the list" loops.</li>',
    '<li>Your biology is the strategy. The brief tells you what to do with it.</li>',
    '</ul>',
    '<p>One ask while you wait: notice the day you feel unstoppable this month. Write it down. That\'s data. I\'ll use it.</p>',
    '<p>Talk soon,<br>Dot</p>',
    '<p style="color:#666;font-size:12px;">PeakHer. Your biology is the strategy.</p>'
  ].join('\n');

  return { subject: subject, body: html };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, firstName, role, source, quizScore, quizLevel } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  // Validate waitlist inputs
  if (firstName != null && (typeof firstName !== 'string' || firstName.length > 100)) {
    return res.status(400).json({ error: 'First name must be a string of at most 100 characters' });
  }
  if (role != null && (typeof role !== 'string' || role.length > 50)) {
    return res.status(400).json({ error: 'Role must be a string of at most 50 characters' });
  }
  if (quizScore != null) {
    var numScore = Number(quizScore);
    if (!Number.isFinite(numScore) || numScore < 0 || numScore > 45) {
      return res.status(400).json({ error: 'Quiz score must be a number between 0 and 45' });
    }
  }
  if (quizLevel != null && (typeof quizLevel !== 'string' || quizLevel.length > 50)) {
    return res.status(400).json({ error: 'Quiz level must be a string of at most 50 characters' });
  }

  try {
    // Store in local DB for beta invite tracking
    var sql = getDb();
    try {
      await sql`
        INSERT INTO waitlist (email, first_name, role, source, quiz_score, quiz_level)
        VALUES (
          ${email.toLowerCase().trim()},
          ${firstName || null},
          ${role || null},
          ${source || 'landing'},
          ${quizScore ? Number(quizScore) : null},
          ${quizLevel || null}
        )
        ON CONFLICT (email) DO UPDATE SET
          first_name = COALESCE(EXCLUDED.first_name, waitlist.first_name),
          role = COALESCE(EXCLUDED.role, waitlist.role),
          quiz_score = COALESCE(EXCLUDED.quiz_score, waitlist.quiz_score),
          quiz_level = COALESCE(EXCLUDED.quiz_level, waitlist.quiz_level)
      `;
    } catch (dbErr) {
      console.error('Waitlist DB insert error:', dbErr.message);
      // Continue: GHL proxy is primary, local DB is secondary
    }

    // Proxy to Mpenda/GHL (creates/updates the GHL contact)
    const mpendaRes = await fetch(MPENDA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        firstName: firstName || undefined,
        role: role || undefined,
        source: source || 'landing',
        quizScore: quizScore || undefined,
        quizLevel: quizLevel || undefined,
      }),
    });

    const data = await mpendaRes.json();

    if (!mpendaRes.ok || !data.success) {
      console.error('Mpenda error:', mpendaRes.status, JSON.stringify(data));
      return res.status(500).json({ error: 'Failed to process signup. Please try again.' });
    }

    // ---------------------------------------------------------------------
    // Queue a draft welcome message and post to Slack for approval.
    // We do this AFTER the Mpenda/GHL contact creation so approval triggers
    // sending to a known contact. Failures here do not fail the signup.
    // ---------------------------------------------------------------------
    try {
      var template = buildWaitlistWelcome(firstName);
      var ghlContactId = (data && data.contact && data.contact.id)
        || (data && data.contactId)
        || null;

      var inserted = await sql`
        INSERT INTO nurture_queue (
          email, first_name, source, template_key, subject, body, status, ghl_contact_id
        ) VALUES (
          ${email.toLowerCase().trim()},
          ${firstName || null},
          ${source || 'landing'},
          ${'waitlist_welcome'},
          ${template.subject},
          ${template.body},
          ${'draft'},
          ${ghlContactId}
        )
        RETURNING id, email, first_name, source, template_key, subject, body, status, slack_message_ts
      `;
      var draft = inserted[0];

      if (draft) {
        var ts = await slackApproval.postApprovalCard(draft);
        if (ts) {
          await sql`
            UPDATE nurture_queue SET slack_message_ts = ${ts} WHERE id = ${draft.id}
          `;
        }
      }
    } catch (queueErr) {
      // Never block the signup on a queueing/slack failure. Log and move on.
      console.error('Nurture queue error (non-fatal):', queueErr && queueErr.message ? queueErr.message : queueErr);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Waitlist error:', err.message);
    return res.status(500).json({ error: 'Failed to process signup. Please try again.' });
  }
};
