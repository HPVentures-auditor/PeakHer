const bcrypt = require('bcryptjs');
const { getDb } = require('../_lib/db');
const { createToken, sendError } = require('../_lib/auth');

// In-memory rate limiting: 3 registrations per IP per hour
const registerAttempts = new Map();
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_MAX_ATTEMPTS = 3;

function checkRegisterRateLimit(ip) {
  const now = Date.now();
  const record = registerAttempts.get(ip);
  if (!record || now - record.windowStart > REGISTER_WINDOW_MS) {
    registerAttempts.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  record.count++;
  if (record.count > REGISTER_MAX_ATTEMPTS) return false;
  return true;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  if (!checkRegisterRateLimit(clientIp)) {
    return sendError(res, 429, 'Too many registration attempts. Please try again later.');
  }

  const { name, email, password, personas, cycleProfile } = req.body;

  if (!name || !email || !password) {
    return sendError(res, 400, 'Name, email, and password are required');
  }

  if (password.length < 8) {
    return sendError(res, 400, 'Password must be at least 8 characters');
  }

  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return sendError(res, 400, 'Password must contain at least one letter and one number');
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

    // Send welcome email (fire-and-forget, don't block registration)
    try {
      var emailLib = require('../_lib/email');
      var tpl = emailLib.welcomeEmail(user.name);
      emailLib.sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html })
        .catch(function (emailErr) { console.warn('Welcome email failed:', emailErr.message); });
    } catch (emailInitErr) {
      console.warn('Email module not available:', emailInitErr.message);
    }

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
    console.error('Registration error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
