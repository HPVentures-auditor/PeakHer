const bcrypt = require('bcryptjs');
const { getDb } = require('../_lib/db');
const { createToken, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  const { name, email, password, personas, cycleProfile } = req.body;

  if (!name || !email || !password) {
    return sendError(res, 400, 'Name, email, and password are required');
  }

  if (password.length < 6) {
    return sendError(res, 400, 'Password must be at least 6 characters');
  }

  const sql = getDb();

  try {
    // Check if email exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
    if (existing.length > 0) {
      return sendError(res, 409, 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await sql`
      INSERT INTO users (name, email, password_hash, personas, onboarding_complete)
      VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${passwordHash}, ${personas || []}, true)
      RETURNING id, name, email, personas, onboarding_complete, created_at
    `;

    // Create cycle profile if provided
    if (cycleProfile && cycleProfile.trackingEnabled) {
      await sql`
        INSERT INTO cycle_profiles (user_id, tracking_enabled, average_cycle_length, last_period_start)
        VALUES (${user.id}, ${cycleProfile.trackingEnabled}, ${cycleProfile.averageCycleLength || 28}, ${cycleProfile.lastPeriodStart || null})
      `;
    } else {
      await sql`
        INSERT INTO cycle_profiles (user_id, tracking_enabled)
        VALUES (${user.id}, false)
      `;
    }

    // Create streak record
    await sql`INSERT INTO streaks (user_id) VALUES (${user.id})`;

    const token = createToken(user.id);

    return res.status(201).json({
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        personas: user.personas,
        onboardingComplete: user.onboarding_complete,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return sendError(res, 500, 'Server error');
  }
};
