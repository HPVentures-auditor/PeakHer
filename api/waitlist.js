/**
 * POST /api/waitlist
 *
 * Stores waitlist signup locally and proxies to Mpenda/GHL.
 */

var { getDb } = require('./_lib/db');

const MPENDA_URL = 'https://mpenda-production-ecba.up.railway.app/api/ghl/waitlist';

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
      // Continue — GHL proxy is primary, local DB is secondary
    }

    // Proxy to Mpenda/GHL
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

    if (mpendaRes.ok && data.success) {
      return res.status(200).json(data);
    }

    console.error('Mpenda error:', mpendaRes.status, JSON.stringify(data));
    return res.status(500).json({ error: 'Failed to process signup. Please try again.' });
  } catch (err) {
    console.error('Waitlist error:', err.message);
    return res.status(500).json({ error: 'Failed to process signup. Please try again.' });
  }
};
