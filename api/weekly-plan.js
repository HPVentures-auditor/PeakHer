/**
 * PeakHer Weekly Phase-Aware Planner
 *
 * POST /api/weekly-plan
 * Auth required. Body: { "tasks": ["Pitch investors", ...], "weekStart": "2026-05-25" (optional) }
 *
 * Reads the week ahead (cycle phase per day + the user's existing Google
 * Calendar load) and places each priority task on the day whose hormonal phase
 * best fits it, in a real open time block. Read-only on the calendar — it never
 * writes events, it recommends.
 *
 * Returns:
 * {
 *   weekStart, timezone,
 *   phaseMap: [{ date, weekday, phase, phaseLabel, cycleDay, eventCount, busyHours, openBlocks }],
 *   placements: [{ task, date, weekday, phase, phaseLabel, suggestedStart, suggestedEnd, reason }],
 *   unscheduled: [{ task, reason }],
 *   dotSummary: "..."
 * }
 */
var { getDb } = require('./_lib/db');
var { getUserId, sendError } = require('./_lib/auth');
var { sendMessage } = require('./_lib/claude');

var DAY_START_MIN = 8 * 60;   // 08:00 — working window start
var DAY_END_MIN = 20 * 60;    // 20:00 — working window end
var MIN_BLOCK_MIN = 30;       // ignore gaps shorter than 30 min

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var body = req.body || {};
  var rawTasks = Array.isArray(body.tasks) ? body.tasks : null;
  if (!rawTasks || rawTasks.length === 0) {
    return sendError(res, 400, 'Request body must include a non-empty "tasks" array.');
  }
  // Accept strings or { task, durationMin } objects; normalize to strings + optional durations.
  var tasks = rawTasks.slice(0, 20).map(function (t) {
    if (typeof t === 'string') return { text: t.trim(), durationMin: null };
    if (t && typeof t.task === 'string') return { text: t.task.trim(), durationMin: t.durationMin || null };
    return null;
  }).filter(function (t) { return t && t.text; });

  if (tasks.length === 0) return sendError(res, 400, 'No valid tasks provided.');

  var sql = getDb();

  try {
    // ── 1. User + cycle profile ──────────────────────────────────────
    var users = await sql`
      SELECT u.name, COALESCE(u.sms_timezone, 'America/New_York') AS tz
      FROM users u WHERE u.id = ${userId} LIMIT 1
    `;
    if (users.length === 0) return sendError(res, 404, 'User not found.');
    var name = users[0].name || 'there';
    var tz = users[0].tz;

    var profiles = await sql`
      SELECT last_period_start, average_cycle_length, tracking_enabled
      FROM cycle_profiles WHERE user_id = ${userId} LIMIT 1
    `;
    var profile = profiles.length > 0 ? profiles[0] : null;
    if (!profile || !profile.tracking_enabled || !profile.last_period_start) {
      return sendError(res, 400, 'Cycle tracking not configured. Complete onboarding first.');
    }
    var cycleLength = profile.average_cycle_length || 28;

    // ── 2. Resolve the 7-day window in the USER'S timezone ───────────
    var todayRows = await sql`SELECT to_char(now() AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS today`;
    var todayLocal = todayRows[0].today;
    var weekStart = isValidDate(body.weekStart) ? body.weekStart : todayLocal;
    var weekDates = [];
    for (var i = 0; i < 7; i++) weekDates.push(addDays(weekStart, i));
    var windowEnd = addDays(weekStart, 7);

    // ── 3. Pull the week's events, bucketed into LOCAL days ──────────
    // Wider UTC window (±1 day) so events near local midnight bucket correctly.
    var fetchFrom = addDays(weekStart, -1) + 'T00:00:00Z';
    var fetchTo = addDays(windowEnd, 1) + 'T00:00:00Z';
    var eventRows = await sql`
      SELECT
        title, event_type, estimated_importance, is_all_day,
        to_char(start_time AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS local_date,
        to_char(start_time AT TIME ZONE ${tz}, 'HH24:MI') AS local_start,
        to_char(end_time   AT TIME ZONE ${tz}, 'HH24:MI') AS local_end
      FROM calendar_events
      WHERE user_id = ${userId}
        AND start_time >= ${fetchFrom}
        AND start_time <  ${fetchTo}
      ORDER BY start_time ASC
    `;

    var eventsByDay = {};
    weekDates.forEach(function (d) { eventsByDay[d] = []; });
    eventRows.forEach(function (e) {
      if (!eventsByDay[e.local_date]) return; // outside the 7 target days
      eventsByDay[e.local_date].push(e);
    });

    // ── 4. Build the per-day phase map + open slots ──────────────────
    var phaseMap = weekDates.map(function (date) {
      var cycleDay = calculateCycleDay(profile.last_period_start, cycleLength, date);
      var internalPhase = getPhaseForCycleDay(cycleDay, cycleLength);
      var phaseLabel = getModeName(internalPhase);
      var dayEvents = eventsByDay[date] || [];

      var timed = dayEvents.filter(function (e) { return !e.is_all_day && e.local_start && e.local_end; });
      var busyIntervals = timed.map(function (e) {
        return { start: toMin(e.local_start), end: toMin(e.local_end), title: e.title };
      }).filter(function (iv) { return iv.end > iv.start; });

      var openBlocks = computeOpenBlocks(busyIntervals);
      var busyMin = busyIntervals.reduce(function (s, iv) {
        return s + (Math.min(iv.end, DAY_END_MIN) - Math.max(iv.start, DAY_START_MIN) > 0
          ? Math.min(iv.end, DAY_END_MIN) - Math.max(iv.start, DAY_START_MIN) : 0);
      }, 0);

      return {
        date: date,
        weekday: weekdayName(date),
        cycleDay: cycleDay,
        phase: internalPhase,
        phaseLabel: phaseLabel,
        eventCount: dayEvents.length,
        allDayCount: dayEvents.filter(function (e) { return e.is_all_day; }).length,
        busyHours: Math.round((busyMin / 60) * 10) / 10,
        busyIntervals: busyIntervals.map(function (iv) { return fromMin(iv.start) + '-' + fromMin(iv.end) + ' ' + iv.title; }),
        openBlocks: openBlocks.map(function (b) { return { start: fromMin(b.start), end: fromMin(b.end), minutes: b.end - b.start }; })
      };
    });

    // ── 5. Place the tasks (AI, with deterministic fallback) ─────────
    var plan = await buildPlanWithAI(name, weekStart, tz, phaseMap, tasks);
    if (!plan) plan = buildPlanFallback(name, phaseMap, tasks);

    // Strip internal-only fields from the phase map before returning.
    var publicPhaseMap = phaseMap.map(function (d) {
      return {
        date: d.date, weekday: d.weekday, phase: d.phase, phaseLabel: d.phaseLabel,
        cycleDay: d.cycleDay, eventCount: d.eventCount, busyHours: d.busyHours,
        openBlocks: d.openBlocks
      };
    });

    return res.status(200).json({
      weekStart: weekStart,
      timezone: tz,
      phaseMap: publicPhaseMap,
      placements: plan.placements,
      unscheduled: plan.unscheduled,
      dotSummary: plan.dotSummary
    });
  } catch (err) {
    console.error('Weekly-plan error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};


// ── AI placement ───────────────────────────────────────────────────────

async function buildPlanWithAI(name, weekStart, tz, phaseMap, tasks) {
  var dayLines = phaseMap.map(function (d) {
    var open = d.openBlocks.length
      ? d.openBlocks.map(function (b) { return b.start + '-' + b.end; }).join(', ')
      : 'no open block in working hours';
    var busy = d.busyIntervals.length ? d.busyIntervals.join('; ') : 'nothing scheduled';
    return '- ' + d.weekday + ' ' + d.date + ' [' + d.phaseLabel + ', cycle day ' + d.cycleDay + ']: '
      + 'existing: ' + busy + '. open: ' + open + '.';
  }).join('\n');

  var affinity =
    'Phase -> task fit:\n'
    + '- Restore (menstrual): low energy. Best for review, reflection, planning, solo strategy, light admin. Avoid high-stakes/outward tasks.\n'
    + '- Rise (follicular): rising energy + creativity. Best for starting projects, brainstorming, learning, first drafts, strategy.\n'
    + '- Peak (ovulatory): peak confidence + verbal skill. Best for pitches, presentations, negotiations, sales, leading, hard conversations, interviews.\n'
    + '- Sustain (luteal): detail + completion mode. Best for proofreading, reviews, wrap-ups, organizing, finances, documentation. Avoid brand-new high-novelty work.';

  var system =
    'You are Dot, PeakHer\'s Hormonal Intelligence AI. You plan a woman\'s week by placing her '
    + 'priority tasks on the days whose hormonal phase best fits each task, while respecting her '
    + 'existing calendar.\n\n'
    + affinity + '\n\n'
    + 'Rules:\n'
    + '1. Match each task to the best-fit PHASE first, then to a day in that phase that has enough open time.\n'
    + '2. Place the task inside one of that day\'s listed open blocks. Suggest a concrete start and end time (24h HH:MM). Default 60 min unless the task implies otherwise.\n'
    + '3. Spread load: avoid stacking two heavy/high-stakes tasks on the same day if another fitting day exists.\n'
    + '4. Protect Restore days — only put genuinely low-energy tasks there.\n'
    + '5. If no day in the week fits a task well or there is no open time, put it in "unscheduled" with a short reason. A task appears EXACTLY ONCE: either in placements OR in unscheduled, never both.\n'
    + '6. Every reason ties the choice to BOTH her phase and her schedule, in one short sentence. Lead with the action. Use "you"/"your", never "we".\n'
    + '7. NEVER use em dashes (do not use the character "—"). Use commas, colons, periods, or parentheses instead.\n\n'
    + 'Return ONLY valid JSON (no markdown, no code fences) in this exact shape:\n'
    + '{\n'
    + '  "placements": [\n'
    + '    { "task": "exact task text", "date": "YYYY-MM-DD", "suggestedStart": "HH:MM", "suggestedEnd": "HH:MM", "reason": "one sentence" }\n'
    + '  ],\n'
    + '  "unscheduled": [ { "task": "exact task text", "reason": "why" } ],\n'
    + '  "dotSummary": "2-3 sentences in Dot\'s voice on how to play the week."\n'
    + '}';

  var userMessage =
    name + '\'s week starting ' + weekStart + ' (timezone ' + tz + '). Working hours 08:00-20:00.\n\n'
    + 'Days:\n' + dayLines + '\n\n'
    + 'Priority tasks to place this week:\n'
    + tasks.map(function (t, i) {
        return (i + 1) + '. ' + t.text + (t.durationMin ? ' (~' + t.durationMin + ' min)' : '');
      }).join('\n');

  var ai;
  try {
    ai = await sendMessage({ system: system, userMessage: userMessage, maxTokens: 1500, temperature: 0.2 });
  } catch (e) {
    console.error('Weekly-plan AI call failed:', e.message);
    return null;
  }
  if (!ai || ai.skipped || !ai.content) return null;

  var parsed;
  try {
    var content = ai.content.trim();
    if (content.indexOf('```') === 0) content = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('Weekly-plan JSON parse error:', e.message, 'Raw:', ai.content);
    return null;
  }

  // Decorate placements with weekday + phase resolved from our own phase map
  // (don't trust the model to echo phase labels correctly).
  var byDate = {};
  phaseMap.forEach(function (d) { byDate[d.date] = d; });

  var placements = (parsed.placements || []).map(function (p) {
    var d = byDate[p.date] || null;
    return {
      task: p.task,
      date: p.date,
      weekday: d ? d.weekday : weekdayName(p.date),
      phase: d ? d.phase : null,
      phaseLabel: d ? d.phaseLabel : null,
      suggestedStart: p.suggestedStart || null,
      suggestedEnd: p.suggestedEnd || null,
      reason: p.reason || ''
    };
  });

  return {
    placements: placements,
    unscheduled: parsed.unscheduled || [],
    dotSummary: parsed.dotSummary || ''
  };
}


// ── Deterministic fallback (no AI) ───────────────────────────────────────

function buildPlanFallback(name, phaseMap, tasks) {
  var placements = [];
  var unscheduled = [];
  // Track minutes already committed per day so we don't double-book the fallback.
  var usedStart = {};

  tasks.forEach(function (t) {
    var target = targetPhaseForTask(t.text);
    var dur = t.durationMin || 60;

    // Candidate days: prefer matching phase, then any day, ranked by largest open block.
    var candidates = phaseMap.slice().filter(function (d) { return d.openBlocks.length > 0; });
    candidates.sort(function (a, b) {
      var am = a.phase === target ? 0 : 1;
      var bm = b.phase === target ? 0 : 1;
      if (am !== bm) return am - bm;
      return largestBlock(b) - largestBlock(a);
    });

    var placed = false;
    for (var i = 0; i < candidates.length && !placed; i++) {
      var d = candidates[i];
      var startMin = nextFreeStart(d, usedStart[d.date] || DAY_START_MIN, dur);
      if (startMin === null) continue;
      usedStart[d.date] = startMin + dur + 15; // leave a 15-min buffer
      placements.push({
        task: t.text,
        date: d.date,
        weekday: d.weekday,
        phase: d.phase,
        phaseLabel: d.phaseLabel,
        suggestedStart: fromMin(startMin),
        suggestedEnd: fromMin(startMin + dur),
        reason: phaseReason(d.phaseLabel, d.phase === target)
      });
      placed = true;
    }
    if (!placed) unscheduled.push({ task: t.text, reason: 'No open time this week that fits. Consider next week or freeing a block.' });
  });

  var peakDay = phaseMap.find(function (d) { return d.phase === 'perform'; });
  var summary = name + ', here\'s your week mapped to your biology. '
    + (peakDay ? 'Front-load anything high-stakes around ' + peakDay.weekday + ' when your Peak energy lands. ' : '')
    + 'Save the detail work and admin for your Sustain days, and protect your Restore days for lighter, inward tasks.';

  return { placements: placements, unscheduled: unscheduled, dotSummary: summary };
}

function phaseReason(phaseLabel, matched) {
  var map = {
    Restore: 'Restore day — keep it light and inward; this fits your lower-energy window.',
    Rise: 'Rise day — your energy and creativity are climbing, good for starting and building.',
    Peak: 'Peak day — your confidence and verbal edge are highest; put your boldest work here.',
    Sustain: 'Sustain day — you\'re in detail-and-finish mode, ideal for wrapping things up.'
  };
  var base = map[phaseLabel] || (phaseLabel + ' day.');
  return matched ? base : base + ' (best-available open time this week)';
}

function targetPhaseForTask(text) {
  var lower = (text || '').toLowerCase();
  var rules = [
    { phase: 'perform', kw: ['pitch', 'present', 'presentation', 'negotiat', 'sales', 'sell', 'interview', 'lead ', 'keynote', 'demo', 'close', 'meeting', 'call', 'hard conversation', 'ask for'] },
    { phase: 'build', kw: ['brainstorm', 'idea', 'start', 'launch', 'create', 'design', 'write', 'draft', 'learn', 'plan ', 'strategy', 'explore', 'research'] },
    { phase: 'complete', kw: ['review', 'edit', 'proofread', 'organize', 'organise', 'finance', 'budget', 'reconcile', 'wrap', 'finish', 'document', 'admin', 'taxes', 'invoice', 'clean'] },
    { phase: 'reflect', kw: ['reflect', 'journal', 'rest', 'recover', 'evaluate', 'audit', 'think', 'read'] }
  ];
  for (var i = 0; i < rules.length; i++) {
    for (var j = 0; j < rules[i].kw.length; j++) {
      if (lower.indexOf(rules[i].kw[j]) !== -1) return rules[i].phase;
    }
  }
  return 'build'; // default: treat unknown work as build/start energy
}


// ── Open-slot math ───────────────────────────────────────────────────────

function computeOpenBlocks(busyIntervals) {
  // Clamp + sort busy intervals to the working window, then return the gaps.
  var clamped = busyIntervals
    .map(function (iv) { return { start: Math.max(iv.start, DAY_START_MIN), end: Math.min(iv.end, DAY_END_MIN) }; })
    .filter(function (iv) { return iv.end > iv.start; })
    .sort(function (a, b) { return a.start - b.start; });

  // Merge overlaps
  var merged = [];
  clamped.forEach(function (iv) {
    var last = merged[merged.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else merged.push({ start: iv.start, end: iv.end });
  });

  var blocks = [];
  var cursor = DAY_START_MIN;
  merged.forEach(function (iv) {
    if (iv.start - cursor >= MIN_BLOCK_MIN) blocks.push({ start: cursor, end: iv.start });
    cursor = Math.max(cursor, iv.end);
  });
  if (DAY_END_MIN - cursor >= MIN_BLOCK_MIN) blocks.push({ start: cursor, end: DAY_END_MIN });
  return blocks;
}

function largestBlock(day) {
  return day.openBlocks.reduce(function (m, b) { return Math.max(m, b.minutes); }, 0);
}

function nextFreeStart(day, fromMinVal, dur) {
  for (var i = 0; i < day.openBlocks.length; i++) {
    var b = day.openBlocks[i];
    var start = Math.max(toMin(b.start), fromMinVal);
    if (toMin(b.end) - start >= dur) return start;
  }
  return null;
}


// ── Date / time helpers ──────────────────────────────────────────────────

function isValidDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseDate(s).getTime());
}

function parseDate(str) {
  var p = String(str).split('-');
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
}

function formatDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function addDays(dateStr, n) {
  var d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

function weekdayName(dateStr) {
  var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return names[parseDate(dateStr).getDay()];
}

function toMin(hhmm) {
  var p = String(hhmm).split(':');
  return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}

function fromMin(min) {
  var h = Math.floor(min / 60);
  var m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}


// ── Cycle math (matches briefing.js / task-sort.js) ──────────────────────

function calculateCycleDay(lastPeriodStart, cycleLength, dateStr) {
  var startStr = lastPeriodStart instanceof Date
    ? lastPeriodStart.toISOString().split('T')[0]
    : String(lastPeriodStart).split('T')[0];
  var start = parseDate(startStr);
  var current = parseDate(dateStr);
  if (!start || !current) return null;
  var daysDiff = Math.floor((current.getTime() - start.getTime()) / 86400000);
  var len = cycleLength || 28;
  return (((daysDiff % len) + len) % len) + 1; // handle dates before last period too
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

// Internal helpers exposed for unit tests only.
module.exports._test = {
  computeOpenBlocks: computeOpenBlocks,
  buildPlanFallback: buildPlanFallback,
  targetPhaseForTask: targetPhaseForTask,
  calculateCycleDay: calculateCycleDay,
  getPhaseForCycleDay: getPhaseForCycleDay,
  getModeName: getModeName,
  toMin: toMin,
  fromMin: fromMin
};
