/**
 * POST /api/waitlist
 *
 * Creates a contact in the PeakHer GHL subaccount and tags them.
 *
 * Body (JSON):
 *   - email (required)
 *   - firstName (optional)
 *   - role (optional) — from quiz lead capture
 *   - source: "landing" | "quiz" (default: "landing")
 *   - quizScore (optional) — numeric score from quiz
 *   - quizLevel (optional) — e.g. "Rhythm-Blind", "Rhythm-Aware"
 */

const GHL_API_KEY = process.env.GHL_PEAKHER_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_PEAKHER_LOCATION_ID || 'wI5jQBObd8CE6n7h1bjQ';
const GHL_BASE = 'https://services.leadconnectorhq.com';

async function ghlRequest(path, method, body) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`GHL ${method} ${path} failed: ${res.status} — ${JSON.stringify(data)}`);
  }
  return data;
}

async function findContact(email) {
  try {
    const data = await ghlRequest(
      `/contacts/search/duplicate?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(email)}`,
      'GET'
    );
    return data.contact || null;
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!GHL_API_KEY) {
    console.error('GHL_PEAKHER_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { email, firstName, role, source, quizScore, quizLevel } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    // Build tags
    const tags = ['waitlist'];
    const src = source || 'landing';
    tags.push(`source-${src}`);

    if (quizLevel) {
      tags.push(`quiz-${quizLevel.toLowerCase().replace(/\s+/g, '-')}`);
    }
    if (quizScore) {
      tags.push('quiz-completed');
    }
    if (role) {
      tags.push(`role-${role.toLowerCase().replace(/\s+/g, '-')}`);
    }

    // Check if contact already exists
    const existing = await findContact(email);

    let contact;
    if (existing) {
      // Add tags to existing contact
      contact = existing;
      for (const tag of tags) {
        try {
          await ghlRequest(`/contacts/${contact.id}/tags`, 'POST', {
            tags: [tag],
          });
        } catch (e) {
          console.warn(`Failed to add tag "${tag}":`, e.message);
        }
      }
    } else {
      // Create new contact
      const contactPayload = {
        locationId: GHL_LOCATION_ID,
        email: email.trim().toLowerCase(),
        tags,
        source: src === 'quiz' ? 'Quiz Assessment' : 'Landing Page Waitlist',
      };
      if (firstName) contactPayload.firstName = firstName.trim();
      if (role) {
        contactPayload.customFields = [
          { key: 'role', field_value: role },
        ];
      }

      const createRes = await ghlRequest('/contacts/', 'POST', contactPayload);
      contact = createRes.contact;
    }

    // Add quiz score as a note if provided
    if (quizScore && contact?.id) {
      try {
        await ghlRequest(`/contacts/${contact.id}/notes`, 'POST', {
          body: `Quiz Score: ${quizScore}/45 — Level: ${quizLevel || 'Unknown'}. Source: ${src}.`,
        });
      } catch (e) {
        console.warn('Failed to add quiz note:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      contactId: contact?.id,
      isNew: !existing,
    });
  } catch (err) {
    console.error('Waitlist error:', err);
    return res.status(500).json({ error: 'Failed to process signup. Please try again.' });
  }
};
