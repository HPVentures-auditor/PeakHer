/**
 * PeakHer Phase-Aware Task Intelligence API
 *
 * POST /api/task-sort
 * Auth required. Accepts { "tasks": ["task1", "task2", ...] }
 * Uses Claude AI to classify tasks as great-for-today or consider-moving
 * based on the user's current cycle phase.
 */
var { getDb } = require('./_lib/db');
var { getUserId, sendError } = require('./_lib/auth');
var { sendMessage } = require('./_lib/claude');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var body = req.body;
  if (!body || !Array.isArray(body.tasks) || body.tasks.length === 0) {
    return sendError(res, 400, 'Request body must include a non-empty "tasks" array.');
  }

  var tasks = body.tasks;
  if (tasks.length > 50) {
    return sendError(res, 400, 'Maximum 50 tasks per request.');
  }

  var sql = getDb();

  try {
    var today = new Date().toISOString().split('T')[0];

    // Fetch cycle profile
    var profiles = await sql`
      SELECT last_period_start, average_cycle_length, tracking_enabled
      FROM cycle_profiles WHERE user_id = ${userId} LIMIT 1
    `;
    var cycleProfile = profiles.length > 0 ? profiles[0] : null;

    if (!cycleProfile || !cycleProfile.tracking_enabled || !cycleProfile.last_period_start) {
      return sendError(res, 400, 'Cycle tracking not configured. Complete onboarding first.');
    }

    var cycleLength = cycleProfile.average_cycle_length || 28;
    var cycleDay = calculateCycleDay(cycleProfile.last_period_start, cycleLength, today);
    var internalPhase = getPhaseForCycleDay(cycleDay, cycleLength);
    var phaseName = getModeName(internalPhase);

    // Build the system prompt with phase-specific task affinities
    var phaseInfo = getPhaseTaskInfo(internalPhase, phaseName, cycleDay, cycleLength);

    var systemPrompt = 'You are Dot, PeakHer\'s Hormonal Intelligence AI. You classify tasks based on the user\'s current hormonal phase.\n\n'
      + 'The user is currently in the **' + phaseName + '** phase (cycle day ' + cycleDay + ' of ' + cycleLength + ').\n\n'
      + phaseInfo.description + '\n\n'
      + '**GOOD tasks for ' + phaseName + ':** ' + phaseInfo.good.join(', ') + '\n'
      + '**BAD tasks for ' + phaseName + ' (move to another phase):** ' + phaseInfo.bad.join(', ') + '\n\n'
      + 'Phase schedule for moved tasks:\n'
      + '- Restore (menstrual, days 1-5): review, evaluate, reflect, journal, planning, auditing\n'
      + '- Rise (follicular, days 6-14): brainstorming, starting projects, learning, creative work\n'
      + '- Peak (ovulatory, days 15-17): presentations, pitches, negotiations, sales, leading meetings\n'
      + '- Sustain (luteal, days 18-28): proofreading, reviews, project wrap-ups, organizing, detail work\n\n'
      + 'For each task the user provides, classify it into one of two categories:\n'
      + '1. "great_for_today" — tasks that align well with ' + phaseName + ' energy\n'
      + '2. "consider_moving" — tasks better suited for a different phase\n\n'
      + 'For "consider_moving" tasks, suggest which phase is better and approximately how many days until that phase arrives (based on cycle day ' + cycleDay + ' of ' + cycleLength + ').\n\n'
      + 'Return ONLY valid JSON in this exact format (no markdown, no code fences):\n'
      + '{\n'
      + '  "great_for_today": [\n'
      + '    { "task": "exact task text", "reason": "short reason tied to phase" }\n'
      + '  ],\n'
      + '  "consider_moving": [\n'
      + '    { "task": "exact task text", "reason": "why and when to do it instead" }\n'
      + '  ]\n'
      + '}';

    var userMessage = 'Classify these tasks for my ' + phaseName + ' phase (day ' + cycleDay + '):\n\n'
      + tasks.map(function(t, i) { return (i + 1) + '. ' + t; }).join('\n');

    var aiResult = await sendMessage({
      system: systemPrompt,
      userMessage: userMessage,
      maxTokens: 1024,
      temperature: 0
    });

    if (aiResult.skipped) {
      // AI unavailable — return a static fallback
      return res.status(200).json({
        phase: phaseName,
        cycle_day: cycleDay,
        great_for_today: tasks.map(function(t) {
          return { task: t, reason: 'AI classification unavailable. Review manually.' };
        }),
        consider_moving: []
      });
    }

    // Parse Claude's JSON response
    var classified;
    try {
      var content = aiResult.content.trim();
      // Strip markdown code fences if Claude adds them despite instructions
      if (content.indexOf('```') === 0) {
        content = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }
      classified = JSON.parse(content);
    } catch (parseErr) {
      console.error('Task-sort JSON parse error:', parseErr.message, 'Raw:', aiResult.content);
      return sendError(res, 502, 'AI returned invalid response. Try again.');
    }

    return res.status(200).json({
      phase: phaseName,
      cycle_day: cycleDay,
      great_for_today: classified.great_for_today || [],
      consider_moving: classified.consider_moving || []
    });
  } catch (err) {
    console.error('Task-sort POST error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};


// ── Phase task affinities ──────────────────────────────────────────────

function getPhaseTaskInfo(internalPhase, phaseName, cycleDay, cycleLength) {
  switch (internalPhase) {
    case 'reflect':
      return {
        description: 'Restore phase: Energy is at its lowest. The body is recovering. Ideal for introspective, low-stimulation tasks. Avoid anything requiring extroversion or high energy.',
        good: ['review', 'evaluate', 'reflect', 'journal', 'planning', 'auditing', 'solo research', 'strategic thinking'],
        bad: ['presentations', 'networking events', 'starting new projects', 'high-stakes meetings', 'public speaking']
      };
    case 'build':
      return {
        description: 'Rise phase: Estrogen is climbing, energy is building, creativity and curiosity are peaking. The brain is primed for new information and novelty. Avoid monotonous or detail-heavy tasks.',
        good: ['brainstorming', 'starting new projects', 'learning new skills', 'creative work', 'writing first drafts', 'exploration', 'strategy sessions'],
        bad: ['repetitive admin', 'detailed editing', 'proofreading', 'data entry', 'routine maintenance tasks']
      };
    case 'perform':
      return {
        description: 'Peak phase: Estrogen and testosterone peak together. Verbal skills, confidence, and social energy are at their highest. This is your most magnetic, outward-facing window.',
        good: ['presentations', 'pitches', 'negotiations', 'sales calls', 'leading meetings', 'networking', 'interviews', 'difficult conversations'],
        bad: ['solo deep-work', 'hiding behind email', 'long solo research', 'heads-down coding', 'avoiding people']
      };
    case 'complete':
      return {
        description: 'Sustain phase: Progesterone dominates. The brain shifts to detail-orientation and completion mode. Excellent for finishing, polishing, and organizing. Poor for starting from scratch or high-novelty work.',
        good: ['proofreading', 'code reviews', 'project wrap-ups', 'organizing', 'detail work', 'financial reviews', 'editing', 'process documentation'],
        bad: ['starting new projects', 'creative ideation from scratch', 'brainstorming sessions', 'learning brand-new skills', 'major pivots']
      };
    default:
      return {
        description: phaseName + ' phase.',
        good: ['general tasks'],
        bad: []
      };
  }
}


// ── Date helpers (duplicated from briefing.js) ─────────────────────────

function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  var parts = str.split('-');
  if (parts.length !== 3) return null;
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function addDays(dateStr, n) {
  var d = parseDate(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + n);
  return formatDate(d);
}


// ── Cycle calculation (duplicated from briefing.js) ────────────────────

function calculateCycleDay(lastPeriodStart, cycleLength, dateStr) {
  var startStr = lastPeriodStart instanceof Date
    ? lastPeriodStart.toISOString().split('T')[0]
    : String(lastPeriodStart);
  var start = parseDate(startStr);
  var current = parseDate(dateStr);
  if (!start || !current) return null;
  var diffMs = current.getTime() - start.getTime();
  if (diffMs < 0) return null;
  var daysDiff = Math.floor(diffMs / 86400000);
  var len = cycleLength || 28;
  return (daysDiff % len) + 1;
}

function getPhaseForCycleDay(cycleDay, cycleLength) {
  if (!cycleDay || cycleDay < 1) return null;
  var len = cycleLength || 28;
  var scale = len / 28;
  var reflectEnd = Math.round(5 * scale);
  var buildEnd = Math.round(14 * scale);
  var performEnd = Math.round(17 * scale);

  if (cycleDay <= reflectEnd) return 'reflect';
  if (cycleDay <= buildEnd) return 'build';
  if (cycleDay <= performEnd) return 'perform';
  return 'complete';
}

function getModeName(phase) {
  switch (phase) {
    case 'reflect': return 'Restore';
    case 'build': return 'Rise';
    case 'perform': return 'Peak';
    case 'complete': return 'Sustain';
    default: return 'Rise';
  }
}
