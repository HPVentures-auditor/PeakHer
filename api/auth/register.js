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

  const { name, email, password, personas, cycleProfile, coachVoice, lifestyle } = req.body;

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

    // Voice is always 'dot' now
    const voice = 'dot';

    // Sanitize lifestyle data
    const safeLifestyle = lifestyle && typeof lifestyle === 'object' ? {
      dietType: String(lifestyle.dietType || '').slice(0, 100),
      dietaryRestrictions: Array.isArray(lifestyle.dietaryRestrictions) ? lifestyle.dietaryRestrictions.slice(0, 10).map(r => String(r).slice(0, 50)) : [],
      trainingPlan: String(lifestyle.trainingPlan || '').slice(0, 100),
      fastingEnabled: !!lifestyle.fastingEnabled,
      fastingProtocol: String(lifestyle.fastingProtocol || '').slice(0, 50)
    } : {};

    const [user] = await sql`
      INSERT INTO users (name, email, password_hash, personas, onboarding_complete, coach_voice, lifestyle)
      VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${passwordHash}, ${personas || []}, true, ${voice}, ${JSON.stringify(safeLifestyle)})
      RETURNING id, name, email, personas, onboarding_complete, coach_voice, created_at
    `;

    // Create cycle profile if provided
    if (cycleProfile && cycleProfile.trackingEnabled) {
      const validConfidence = ['exact', 'estimated'];
      const confidence = cycleProfile.cycleDateConfidence && validConfidence.indexOf(cycleProfile.cycleDateConfidence) !== -1
        ? cycleProfile.cycleDateConfidence : 'estimated';
      await sql`
        INSERT INTO cycle_profiles (user_id, tracking_enabled, average_cycle_length, last_period_start, cycle_date_confidence, coach_voice)
        VALUES (${user.id}, ${cycleProfile.trackingEnabled}, ${cycleProfile.averageCycleLength || 28}, ${cycleProfile.lastPeriodStart || null}, ${confidence}, ${voice})
      `;
    } else {
      await sql`
        INSERT INTO cycle_profiles (user_id, tracking_enabled, coach_voice)
        VALUES (${user.id}, false, ${voice})
      `;
    }

    // Create streak record
    await sql`INSERT INTO streaks (user_id) VALUES (${user.id})`;

    const token = createToken(user.id);

    // Create GHL contact + send welcome email (fire-and-forget, don't block registration)
    try {
      var ghl = require('../_lib/ghl');
      var tags = ['peakher_user', 'registered'];
      if (cycleProfile && cycleProfile.trackingEnabled) tags.push('cycle_tracking');
      ghl.upsertContact({
        email: user.email,
        firstName: user.name.split(' ')[0],
        tags: tags,
        source: 'PeakHer Registration'
      }).catch(function (ghlErr) { console.warn('GHL contact creation failed:', ghlErr.message); });

      var emailLib = require('../_lib/email');
      var tpl = emailLib.welcomeEmail(user.name);
      emailLib.sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html })
        .catch(function (emailErr) { console.warn('Welcome email failed:', emailErr.message); });
    } catch (emailInitErr) {
      console.warn('Email/GHL module not available:', emailInitErr.message);
    }

    return res.status(201).json({
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        personas: user.personas,
        onboardingComplete: user.onboarding_complete,
        coachVoice: user.coach_voice || 'sassy',
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
