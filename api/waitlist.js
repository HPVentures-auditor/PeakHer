/**
 * POST /api/waitlist
 *
 * Proxies waitlist signups to Mpenda backend, which creates the GHL contact.
 */

const MPENDA_URL = 'https://mpenda-production-ecba.up.railway.app/api/ghl/waitlist';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, firstName, role, source, quizScore, quizLevel } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
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
