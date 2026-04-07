/**
 * PeakHer Email Daily Brief API
 *
 * GET  /api/email-brief — Generate the full HTML email for the authenticated user (returns JSON with html field)
 * POST /api/email-brief — With { "send": true } to generate AND send the email
 *
 * Auth required. Calculates cycle phase from onboarding data and builds
 * a 12-section, inline-CSS HTML email matching Amanda's design spec.
 */

var { getDb } = require('./_lib/db');
var { getUserId, sendError } = require('./_lib/auth');
var { sendMessage } = require('./_lib/claude');
var { sendEmail } = require('./_lib/email');


// ── Date helpers ────────────────────────────────────────────────────────

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

function formatEventTime(isoStr) {
  if (!isoStr) return '';
  var d = new Date(isoStr);
  var hours = d.getHours();
  var minutes = d.getMinutes();
  var ampm = hours >= 12 ? 'PM' : 'AM';
  var h = hours % 12;
  if (h === 0) h = 12;
  var m = minutes < 10 ? '0' + minutes : '' + minutes;
  return h + ':' + m + ' ' + ampm;
}

function formatDatePretty(dateStr) {
  var d = parseDate(dateStr);
  if (!d) return dateStr;
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}


// ── Cycle calculation ───────────────────────────────────────────────────

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
  if (!cycleDay || cycleDay < 1) return 'build';
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

function getPhaseDayRange(phase, cycleLength) {
  var len = cycleLength || 28;
  var scale = len / 28;
  var reflectEnd = Math.round(5 * scale);
  var buildEnd = Math.round(14 * scale);
  var performEnd = Math.round(17 * scale);
  switch (phase) {
    case 'reflect': return { start: 1, end: reflectEnd };
    case 'build': return { start: reflectEnd + 1, end: buildEnd };
    case 'perform': return { start: buildEnd + 1, end: performEnd };
    case 'complete': return { start: performEnd + 1, end: len };
    default: return { start: 1, end: len };
  }
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

function getPhaseMapName(phase) {
  switch (phase) {
    case 'reflect': return 'menstrual';
    case 'build': return 'follicular';
    case 'perform': return 'ovulatory';
    case 'complete': return 'luteal';
    default: return 'follicular';
  }
}


// ── Phase design tokens ─────────────────────────────────────────────────

var PHASE_DESIGN = {
  reflect: { color: '#9B30FF', emoji: '\uD83C\uDF19', name: 'Restore', label: 'Restore Phase' },
  build:   { color: '#00E5A0', emoji: '\uD83C\uDF31', name: 'Rise',    label: 'Rise Phase' },
  perform: { color: '#FFD700', emoji: '\u2600\uFE0F', name: 'Peak',    label: 'Peak Phase' },
  complete:{ color: '#FF6B6B', emoji: '\uD83C\uDF42', name: 'Sustain', label: 'Sustain Phase' }
};

var PHASE_GREETINGS = {
  reflect: function(n) { return n + ', gentle morning. Your body did a lot this month.'; },
  build:   function(n) { return n + ', today\'s going to be one of those days. The good kind.'; },
  perform: function(n) { return n + ', you\'re in your main character era. Literally. Biologically.'; },
  complete:function(n) { return n + ', your uterus sent a memo.'; }
};

var PHASE_SUBJECTS = {
  reflect: 'Your Restore Brief \u2014 rest is the strategy today \uD83C\uDF19',
  build:   'Your Rise Brief \u2014 your brain just got an upgrade \uD83C\uDF31',
  perform: 'Your Peak Brief \u2014 this is your window \u2600\uFE0F',
  complete:'Your Sustain Brief \u2014 your body rewrote today\'s plan \uD83C\uDF42'
};

var PHASE_SIGNOFFS = {
  reflect: 'The to-do list can wait. Today is about warmth, nourishment, rest. Be gentle. I\'ll have a fresh plan when you\'re ready.',
  build:   'Go be ambitious today. Start the thing. Say yes to the thing. I\'ll be here tomorrow.',
  perform: 'You are genuinely, biologically peaking. Crush it. I\'ll tell you when to ease off. Not today.',
  complete:'You don\'t need to be a productivity machine today. Eat the carbs, do the gentle yoga. The sourdough believes in you.'
};


// ── Utility ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


// ══════════════════════════════════════════════════════════════════════════
//  AI CONTENT GENERATION
// ══════════════════════════════════════════════════════════════════════════

function buildEmailAIPrompt(phase, cycleDay, cycleLength, userName, todayEvents, checkinData) {
  var design = PHASE_DESIGN[phase] || PHASE_DESIGN.build;
  var phaseRange = getPhaseDayRange(phase, cycleLength);
  var dayWithinPhase = cycleDay - phaseRange.start + 1;
  var totalPhaseDays = phaseRange.end - phaseRange.start + 1;

  var parts = [];
  parts.push('You are Dot, PeakHer\'s Hormonal Intelligence AI. Generate content for a daily email brief.');
  parts.push('User: ' + (userName || 'Friend'));
  parts.push('Phase: ' + design.name + ' (' + getPhaseMapName(phase) + ')');
  parts.push('Cycle day: ' + cycleDay + ' of ' + cycleLength);
  parts.push('Day ' + dayWithinPhase + ' of ' + totalPhaseDays + ' in this phase');
  parts.push('');
  parts.push('Generate a JSON object with these fields. Be specific, name foods, workouts, times. Dot\'s voice: direct, cheeky, warm, science-backed. Short punchy sentences. No em dashes. Use Restore/Rise/Peak/Sustain names (not clinical terms).');
  parts.push('');

  if (todayEvents && todayEvents.length > 0) {
    parts.push('TODAY\'S CALENDAR:');
    for (var i = 0; i < todayEvents.length; i++) {
      var ev = todayEvents[i];
      var timeStr = ev.is_all_day ? 'All day' : formatEventTime(ev.start_time);
      parts.push('- ' + timeStr + ': ' + ev.title);
    }
    parts.push('');
  }

  if (checkinData) {
    parts.push('TODAY\'S CHECK-IN: Energy ' + checkinData.energy + '/10, Confidence ' + checkinData.confidence + '/10');
    parts.push('');
  }

  parts.push('Return ONLY valid JSON, no markdown:');
  parts.push('{');
  parts.push('  "hormoneDownload": "2-3 sentences explaining what hormones are doing today in Dot\'s voice",');
  parts.push('  "calendarItems": [{"title":"event name","time":"time","energyTag":"High Energy|Low Energy|Neutral","advice":"1 sentence Dot advice for this meeting"}],');
  parts.push('  "todosGreat": ["task great for today 1","task 2"],');
  parts.push('  "todosMove": ["task to consider moving 1"],');
  parts.push('  "movementDo": ["workout to do 1","workout 2"],');
  parts.push('  "movementSkip": ["workout to skip 1"],');
  parts.push('  "nutritionEat": ["food to eat 1","food 2"],');
  parts.push('  "nutritionEase": ["food to ease up on 1"],');
  parts.push('  "fastingProtocol": "protocol name",');
  parts.push('  "fastingEatWindow": "e.g. 8 AM - 8 PM",');
  parts.push('  "fastingExplanation": "1-2 sentences why this window today",');
  parts.push('  "prepCoachMeeting": "name of hardest meeting today or most important task",');
  parts.push('  "prepCoachAdvice": "2-3 sentences of Dot advice for it",');
  parts.push('  "brainMode": "e.g. Creative Beast / Detail Machine / Social Magnet / Rest & Reflect",');
  parts.push('  "bodyMode": "e.g. Power Mode / Steady State / Gentle Only / Recovery",');
  parts.push('  "energyLevel": "High / Moderate / Low / Rebuilding",');
  parts.push('  "dotQuote": "A short memorable Dot quote for the day, 1 sentence",');
  parts.push('  "scienceFact": "One fascinating hormone/cycle science fact, 1-2 sentences",');
  parts.push('  "shareText": "A shareable version of the science fact, punchy, 1 sentence"');
  parts.push('}');

  return parts.join('\n');
}

async function generateAIContent(phase, cycleDay, cycleLength, userName, todayEvents, checkinData) {
  var prompt = buildEmailAIPrompt(phase, cycleDay, cycleLength, userName, todayEvents, checkinData);
  try {
    var result = await sendMessage({
      system: 'You are Dot, PeakHer\'s Hormonal Intelligence AI. Respond with ONLY valid JSON. No markdown. No backticks.',
      userMessage: prompt,
      maxTokens: 1500,
      temperature: 0.7
    });
    if (result && !result.skipped && result.content) {
      var jsonStr = result.content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      return JSON.parse(jsonStr);
    }
  } catch (err) {
    console.error('Email brief AI error:', err.message);
  }
  return null;
}


// ── Fallback content when AI is unavailable ─────────────────────────────

function getFallbackContent(phase) {
  var fallbacks = {
    reflect: {
      hormoneDownload: 'Estrogen and progesterone are both at their lowest right now. Your body is shedding and resetting. Prostaglandins are causing those cramps, and FSH is starting to rise toward the end of this phase to build the next follicle.',
      todosGreat: ['Strategic review of current projects', 'Journaling and reflective writing', 'Financial reviews or budget analysis'],
      todosMove: ['Big presentations or pitches', 'Networking events', 'Starting brand-new projects'],
      movementDo: ['Gentle yoga or stretching', '20-30 min outdoor walk', 'Breathwork and meditation'],
      movementSkip: ['HIIT or high-intensity training', 'Heavy lifting', 'Hot yoga'],
      nutritionEat: ['Iron-rich foods: spinach, lentils, red meat', 'Dark chocolate (70%+) for magnesium', 'Warm soups and bone broth'],
      nutritionEase: ['Excessive caffeine', 'Alcohol', 'Very cold or raw foods'],
      fastingProtocol: '12-Hour Gentle',
      fastingEatWindow: '7 AM \u2013 7 PM',
      fastingExplanation: 'Keep fasting short. Your body is already under stress from menstruation. Eat within an hour of waking.',
      brainMode: 'Rest & Reflect',
      bodyMode: 'Gentle Only',
      energyLevel: 'Rebuilding',
      dotQuote: 'Your BS detector is at maximum strength right now. Use it for insight, not action.',
      scienceFact: 'During menstruation, the two brain hemispheres communicate more than at any other cycle point. Your integrative thinking is actually enhanced.',
      shareText: 'Your brain hemispheres sync up most during your period. Creative problem-solving peaks when energy dips.'
    },
    build: {
      hormoneDownload: 'Estrogen is climbing steadily, bringing a serotonin and dopamine boost with it. Your verbal fluency, spatial reasoning, and learning capacity are all increasing. Testosterone is starting its slow ascent too.',
      todosGreat: ['Brainstorming and ideation sessions', 'Starting new projects', 'Learning new skills or taking courses'],
      todosMove: ['Repetitive admin tasks', 'Tedious bookkeeping', 'Routine maintenance work'],
      movementDo: ['HIIT or interval training', 'Heavy strength training', 'Try a new workout class'],
      movementSkip: ['Playing it too safe', 'Only doing gentle exercise'],
      nutritionEat: ['Fresh colorful salads and fruits', 'Fermented foods: kimchi, yogurt', 'Lean proteins: chicken, fish, eggs'],
      nutritionEase: ['Heavy greasy comfort foods', 'Excessive processed sugar'],
      fastingProtocol: '14-16 Hour IF',
      fastingEatWindow: '11 AM \u2013 7 PM',
      fastingExplanation: 'This is your best phase for intermittent fasting. Cortisol is low, insulin sensitivity is high. Your body handles longer fasts comfortably.',
      brainMode: 'Creative Beast',
      bodyMode: 'Power Mode',
      energyLevel: 'High',
      dotQuote: 'Your hippocampus literally grows during this phase. Feed it something worth learning.',
      scienceFact: 'Your hippocampus (memory center) actually increases in volume during the follicular phase. You literally have more brain for learning right now.',
      shareText: 'Your memory center physically grows mid-cycle. Your brain is designed to learn faster this week.'
    },
    perform: {
      hormoneDownload: 'Estrogen and testosterone are both peaking right now. This dual peak creates your monthly superpower window: maximum confidence, verbal ability, and social magnetism. This window is short, typically 2-3 days.',
      todosGreat: ['Presentations, pitches, public speaking', 'Sales calls and negotiations', 'Difficult conversations you\'ve been putting off'],
      todosMove: ['Detailed solo work', 'Hiding behind email', 'Admin tasks'],
      movementDo: ['Heavy lifting: attempt personal records', 'Sprint intervals at max effort', 'Competitive sports'],
      movementSkip: ['Excessive stretching (ligaments are lax)', 'Skipping warm-ups'],
      nutritionEat: ['Anti-inflammatory foods: turmeric, berries', 'Cruciferous veggies: broccoli, kale', 'Hydrating foods: cucumber, watermelon'],
      nutritionEase: ['Heavy red meat in large quantities', 'Excess sodium', 'Very heavy meals'],
      fastingProtocol: '13-14 Hour Moderate',
      fastingEatWindow: '8 AM \u2013 7 PM',
      fastingExplanation: 'Moderate windows are fine. Your metabolic rate is elevated. This is NOT the time to restrict. This is the time to FUEL.',
      brainMode: 'Social Magnet',
      bodyMode: 'Peak Performance',
      energyLevel: 'High',
      dotQuote: 'You\'re magnetic today, like, scientifically. Schedule the pitch, the date, the hard conversation.',
      scienceFact: 'Research shows voices, faces, and even body scent become measurably more attractive during ovulation. Your body is optimized for connection right now.',
      shareText: 'Your voice literally changes to be more attractive during ovulation. Biology built you a 2-day superpower window.'
    },
    complete: {
      hormoneDownload: 'Progesterone is rising sharply, giving you calm focus and detail-orientation in the early days. As both progesterone and estrogen start to drop later in this phase, serotonin drops too. Your inner editor is activated, and your brain wants completion, not novelty.',
      todosGreat: ['Finishing existing projects', 'Editing and quality assurance', 'Administrative tasks and organization'],
      todosMove: ['Starting brand-new projects', 'Making permanent decisions', 'High-visibility presentations'],
      movementDo: ['Moderate strength training or Pilates', 'Walking 20-30 minutes', 'Gentle yoga or swimming'],
      movementSkip: ['Intense HIIT', 'Hot yoga', 'Pushing for PRs'],
      nutritionEat: ['Complex carbs: sweet potatoes, oatmeal', 'Dark chocolate for magnesium', 'Root vegetables: beets, carrots, squash'],
      nutritionEase: ['Restrictive dieting (you burn 100-300 more cal/day)', 'Excessive caffeine', 'Alcohol'],
      fastingProtocol: '12-13 Hour Light',
      fastingEatWindow: '7 AM \u2013 7 PM',
      fastingExplanation: 'Reduce fasting windows. Cortisol is elevated from progesterone. Extended fasting now raises cortisol further and worsens anxiety. Eat breakfast.',
      brainMode: 'Detail Machine',
      bodyMode: 'Steady State',
      energyLevel: 'Moderate',
      dotQuote: 'Your cravings are your metabolism asking for fuel it genuinely needs. Eat.',
      scienceFact: 'You burn 100-300 more calories per day in the luteal phase. Those cravings are your metabolism literally asking for more fuel.',
      shareText: 'Your body burns up to 300 extra calories/day before your period. Cravings are biology, not weakness.'
    }
  };
  return fallbacks[phase] || fallbacks.build;
}


// ══════════════════════════════════════════════════════════════════════════
//  HTML EMAIL BUILDER
// ══════════════════════════════════════════════════════════════════════════

function buildEmailHtml(opts) {
  var phase = opts.phase;
  var cycleDay = opts.cycleDay;
  var cycleLength = opts.cycleLength;
  var userName = opts.userName;
  var today = opts.today;
  var ai = opts.ai;
  var design = PHASE_DESIGN[phase] || PHASE_DESIGN.build;
  var phaseRange = getPhaseDayRange(phase, cycleLength);
  var totalPhaseDays = phaseRange.end - phaseRange.start + 1;
  var dayWithinPhase = cycleDay - phaseRange.start + 1;
  var progressPct = Math.round((dayWithinPhase / totalPhaseDays) * 100);
  var firstName = (userName || 'Friend').split(' ')[0];
  var greeting = PHASE_GREETINGS[phase] ? PHASE_GREETINGS[phase](escapeHtml(firstName)) : ('Good morning, ' + escapeHtml(firstName) + '.');
  var signoff = PHASE_SIGNOFFS[phase] || PHASE_SIGNOFFS.build;
  var prettyDate = formatDatePretty(today);

  // Build progress bar cells
  var progressBarFilled = Math.round(progressPct / 10);
  var progressBarEmpty = 10 - progressBarFilled;
  var progressCells = '';
  for (var pi = 0; pi < progressBarFilled; pi++) {
    progressCells += '<td style="width:10%;height:8px;background:' + design.color + ';border-radius:' + (pi === 0 ? '4px 0 0 4px' : (pi === 9 ? '0 4px 4px 0' : '0')) + ';"></td>';
  }
  for (var pj = 0; pj < progressBarEmpty; pj++) {
    var idx = progressBarFilled + pj;
    progressCells += '<td style="width:10%;height:8px;background:#E8E4DF;border-radius:' + (idx === 9 ? '0 4px 4px 0' : (idx === 0 ? '4px 0 0 4px' : '0')) + ';"></td>';
  }

  // Calendar items HTML
  var calendarHtml = '';
  if (ai.calendarItems && ai.calendarItems.length > 0) {
    for (var ci = 0; ci < ai.calendarItems.length; ci++) {
      var item = ai.calendarItems[ci];
      var tagColor = item.energyTag === 'High Energy' ? '#00E5A0' : (item.energyTag === 'Low Energy' ? '#FF6B6B' : '#999999');
      calendarHtml += '<tr><td style="padding:8px 0;border-bottom:1px solid #E8E4DF;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
        '<td style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:14px;color:#333333;">' +
        '<strong>' + escapeHtml(item.time || '') + '</strong> ' + escapeHtml(item.title || '') +
        ' <span style="display:inline-block;background:' + tagColor + ';color:#ffffff;font-size:11px;padding:2px 8px;border-radius:10px;margin-left:4px;">' + escapeHtml(item.energyTag || 'Neutral') + '</span>' +
        '</td></tr>' +
        '<tr><td style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:13px;color:#666666;padding-top:4px;font-style:italic;">' +
        escapeHtml(item.advice || '') +
        '</td></tr></table></td></tr>';
    }
  } else {
    calendarHtml = '<tr><td style="padding:12px 0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:14px;color:#888888;font-style:italic;">No calendar events synced for today. Connect your calendar in the app for personalized meeting intelligence.</td></tr>';
  }

  // To-do lists
  var todosGreatHtml = '';
  if (ai.todosGreat) {
    for (var tg = 0; tg < ai.todosGreat.length; tg++) {
      todosGreatHtml += '<tr><td style="padding:4px 0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:14px;color:#333333;">\u2705 ' + escapeHtml(ai.todosGreat[tg]) + '</td></tr>';
    }
  }
  var todosMoveHtml = '';
  if (ai.todosMove) {
    for (var tm = 0; tm < ai.todosMove.length; tm++) {
      todosMoveHtml += '<tr><td style="padding:4px 0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:14px;color:#888888;">\u23F3 ' + escapeHtml(ai.todosMove[tm]) + '</td></tr>';
    }
  }

  // Movement columns
  var movDoHtml = '';
  if (ai.movementDo) {
    for (var md = 0; md < ai.movementDo.length; md++) {
      movDoHtml += '<div style="padding:3px 0;font-size:13px;color:#333333;">\u2705 ' + escapeHtml(ai.movementDo[md]) + '</div>';
    }
  }
  var movSkipHtml = '';
  if (ai.movementSkip) {
    for (var ms = 0; ms < ai.movementSkip.length; ms++) {
      movSkipHtml += '<div style="padding:3px 0;font-size:13px;color:#888888;">\u274C ' + escapeHtml(ai.movementSkip[ms]) + '</div>';
    }
  }

  // Nutrition columns
  var nutEatHtml = '';
  if (ai.nutritionEat) {
    for (var ne = 0; ne < ai.nutritionEat.length; ne++) {
      nutEatHtml += '<div style="padding:3px 0;font-size:13px;color:#333333;">\u2705 ' + escapeHtml(ai.nutritionEat[ne]) + '</div>';
    }
  }
  var nutEaseHtml = '';
  if (ai.nutritionEase) {
    for (var nu = 0; nu < ai.nutritionEase.length; nu++) {
      nutEaseHtml += '<div style="padding:3px 0;font-size:13px;color:#888888;">\u26A0\uFE0F ' + escapeHtml(ai.nutritionEase[nu]) + '</div>';
    }
  }

  var html = '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your Daily Brief</title></head>' +
    '<body style="margin:0;padding:0;background-color:#FAF9F6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,sans-serif;">' +

    // Wrapper table
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAF9F6;"><tr><td align="center" style="padding:20px 10px;">' +
    '<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">' +

    // ── 1. HEADER ──
    '<tr><td style="padding:24px 24px 16px;text-align:center;">' +
    '<div style="font-size:18px;font-weight:800;letter-spacing:4px;color:' + design.color + ';text-transform:uppercase;">PEAKHER</div>' +
    '<div style="font-size:13px;color:#999999;margin-top:6px;">' + escapeHtml(prettyDate) + '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:0 24px 20px;">' +
    '<div style="background:#ffffff;border-radius:12px;padding:20px 24px;border-left:4px solid ' + design.color + ';">' +
    '<div style="font-size:16px;color:#333333;line-height:1.5;">' + escapeHtml(greeting) + '</div>' +
    '</div>' +
    '</td></tr>' +

    // ── 2. CYCLE STATUS ──
    '<tr><td style="padding:0 24px 20px;">' +
    '<div style="background:#ffffff;border-radius:12px;padding:20px 24px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
    '<span style="display:inline-block;background:' + design.color + ';color:#ffffff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:12px;text-transform:uppercase;letter-spacing:1px;">' + escapeHtml(design.name) + '</span>' +
    '<span style="font-size:14px;color:#666666;margin-left:12px;">Day ' + cycleDay + ' of ' + cycleLength + '</span>' +
    '</td></tr></table>' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr>' + progressCells + '</tr></table>' +
    '<div style="font-size:12px;color:#999999;margin-top:6px;">Day ' + dayWithinPhase + ' of ' + totalPhaseDays + ' in ' + escapeHtml(design.name) + '</div>' +
    '</div>' +
    '</td></tr>' +

    // ── 3. HORMONE DOWNLOAD ──
    '<tr><td style="padding:0 24px 20px;">' +
    '<div style="background:#ffffff;border-radius:12px;padding:20px 24px;">' +
    '<div style="font-size:16px;font-weight:700;color:#333333;margin-bottom:10px;">\uD83E\uDDEC The Hormone Download</div>' +
    '<div style="font-size:14px;color:#555555;line-height:1.6;">' + escapeHtml(ai.hormoneDownload || '') + '</div>' +
    '</div>' +
    '</td></tr>' +

    // ── 4. CALENDAR INTELLIGENCE ──
    '<tr><td style="padding:0 24px 20px;">' +
    '<div style="background:#ffffff;border-radius:12px;padding:20px 24px;">' +
    '<div style="font-size:16px;font-weight:700;color:#333333;margin-bottom:10px;">\uD83D\uDCC5 Calendar Intelligence</div>' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0">' + calendarHtml + '</table>' +
    '</div>' +
    '</td></tr>' +

    // ── 5. TO-DO INTELLIGENCE ──
    '<tr><td style="padding:0 24px 20px;">' +
    '<div style="background:#ffffff;border-radius:12px;padding:20px 24px;">' +
    '<div style="font-size:16px;font-weight:700;color:#333333;margin-bottom:10px;">\u2705 To-Do Intelligence</div>' +
    '<div style="font-size:13px;font-weight:600;color:' + design.color + ';margin-bottom:6px;">Great for Today</div>' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0">' + todosGreatHtml + '</table>' +
    '<div style="font-size:13px;font-weight:600;color:#999999;margin-top:12px;margin-bottom:6px;">Consider Moving</div>' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0">' + todosMoveHtml + '</table>' +
    '</div>' +
    '</td></tr>' +

    // ── 6. MOVEMENT INTELLIGENCE ──
    '<tr><td style="padding:0 24px 20px;">' +
    '<div style="background:#ffffff;border-radius:12px;padding:20px 24px;">' +
    '<div style="font-size:16px;font-weight:700;color:#333333;margin-bottom:10px;">\uD83E\uDDD8\u200D\u2640\uFE0F Movement Intelligence \u2014 Do This / Skip That</div>' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td width="48%" valign="top" style="padding-right:8px;">' +
    '<div style="background:#F0FFF4;border-radius:8px;padding:12px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
    '<div style="font-size:13px;font-weight:700;color:#00A86B;margin-bottom:6px;">Do This</div>' +
    movDoHtml +
    '</div></td>' +
    '<td width="4%"></td>' +
    '<td width="48%" valign="top" style="padding-left:8px;">' +
    '<div style="background:#FFF5F5;border-radius:8px;padding:12px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
    '<div style="font-size:13px;font-weight:700;color:#E53E3E;margin-bottom:6px;">Skip That</div>' +
    movSkipHtml +
    '</div></td>' +
    '</tr></table>' +
    '</div>' +
    '</td></tr>' +

    // ── 7. NUTRITION INTELLIGENCE ──
    '<tr><td style="padding:0 24px 20px;">' +
    '<div style="background:#ffffff;border-radius:12px;padding:20px 24px;">' +
    '<div style="font-size:16px;font-weight:700;color:#333333;margin-bottom:10px;">\uD83E\uDD57 Nutrition Intelligence \u2014 Eat This / Ease Up</div>' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td width="48%" valign="top" style="padding-right:8px;">' +
    '<div style="background:#F0FFF4;border-radius:8px;padding:12px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
    '<div style="font-size:13px;font-weight:700;color:#00A86B;margin-bottom:6px;">Eat This</div>' +
    nutEatHtml +
    '</div></td>' +
    '<td width="4%"></td>' +
    '<td width="48%" valign="top" style="padding-left:8px;">' +
    '<div style="background:#FFF5F5;border-radius:8px;padding:12px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
    '<div style="font-size:13px;font-weight:700;color:#E53E3E;margin-bottom:6px;">Ease Up</div>' +
    nutEaseHtml +
    '</div></td>' +
    '</tr></table>' +
    '</div>' +
    '</td></tr>' +

    // ── 8. FASTING INTELLIGENCE ──
    '<tr><td style="padding:0 24px 20px;">' +
    '<div style="background:#ffffff;border-radius:12px;padding:20px 24px;">' +
    '<div style="font-size:16px;font-weight:700;color:#333333;margin-bottom:10px;">\u23F0 Fasting Intelligence</div>' +
    '<div style="display:inline-block;background:' + design.color + '22;border-radius:8px;padding:8px 14px;margin-bottom:10px;">' +
    '<span style="font-size:14px;font-weight:700;color:' + design.color + ';">' + escapeHtml(ai.fastingProtocol || '') + '</span>' +
    '</div>' +
    '<div style="font-size:14px;color:#333333;margin-bottom:6px;">' +
    '<strong>Eating window:</strong> ' + escapeHtml(ai.fastingEatWindow || '') +
    '</div>' +
    '<div style="font-size:14px;color:#555555;line-height:1.5;">' + escapeHtml(ai.fastingExplanation || '') + '</div>' +
    '</div>' +
    '</td></tr>' +

    // ── 9. PREP COACH ──
    '<tr><td style="padding:0 24px 20px;">' +
    '<div style="background:#ffffff;border-radius:12px;padding:20px 24px;border-left:4px solid ' + design.color + ';">' +
    '<div style="font-size:16px;font-weight:700;color:#333333;margin-bottom:10px;">\uD83C\uDFAF Prep Coach</div>' +
    '<div style="font-size:13px;font-weight:600;color:' + design.color + ';margin-bottom:6px;">' + escapeHtml(ai.prepCoachMeeting || 'Your biggest challenge today') + '</div>' +
    '<div style="font-size:14px;color:#555555;line-height:1.5;">' + escapeHtml(ai.prepCoachAdvice || '') + '</div>' +
    '</div>' +
    '</td></tr>' +

    // ── 10. SUMMARY CARD ──
    '<tr><td style="padding:0 24px 20px;">' +
    '<div style="background:' + design.color + ';border-radius:12px;padding:20px 24px;">' +
    '<div style="font-size:16px;font-weight:700;color:#ffffff;margin-bottom:12px;">Today at a Glance</div>' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
    '<tr><td style="padding:4px 0;font-size:13px;color:rgba(255,255,255,0.85);width:40%;">Phase</td><td style="padding:4px 0;font-size:13px;color:#ffffff;font-weight:600;">' + escapeHtml(design.name) + ' \u2022 Day ' + cycleDay + '</td></tr>' +
    '<tr><td style="padding:4px 0;font-size:13px;color:rgba(255,255,255,0.85);">Date</td><td style="padding:4px 0;font-size:13px;color:#ffffff;font-weight:600;">' + escapeHtml(prettyDate) + '</td></tr>' +
    '<tr><td style="padding:4px 0;font-size:13px;color:rgba(255,255,255,0.85);">Brain Mode</td><td style="padding:4px 0;font-size:13px;color:#ffffff;font-weight:600;">' + escapeHtml(ai.brainMode || '') + '</td></tr>' +
    '<tr><td style="padding:4px 0;font-size:13px;color:rgba(255,255,255,0.85);">Body Mode</td><td style="padding:4px 0;font-size:13px;color:#ffffff;font-weight:600;">' + escapeHtml(ai.bodyMode || '') + '</td></tr>' +
    '<tr><td style="padding:4px 0;font-size:13px;color:rgba(255,255,255,0.85);">Energy Level</td><td style="padding:4px 0;font-size:13px;color:#ffffff;font-weight:600;">' + escapeHtml(ai.energyLevel || '') + '</td></tr>' +
    '</table>' +
    '<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.3);font-size:14px;color:#ffffff;font-style:italic;line-height:1.5;">' +
    '&ldquo;' + escapeHtml(ai.dotQuote || '') + '&rdquo;' +
    '</div>' +
    '</div>' +
    '</td></tr>' +

    // ── 11. SHAREABLE CARD ──
    '<tr><td style="padding:0 24px 20px;">' +
    '<div style="background:#ffffff;border-radius:12px;padding:20px 24px;text-align:center;">' +
    '<div style="font-size:14px;font-weight:700;color:#333333;margin-bottom:8px;">\uD83E\uDD13 Science Snack</div>' +
    '<div style="font-size:14px;color:#555555;line-height:1.5;margin-bottom:14px;">' + escapeHtml(ai.scienceFact || '') + '</div>' +
    '<div style="background:#FAF9F6;border-radius:8px;padding:12px;margin-bottom:12px;">' +
    '<div style="font-size:13px;color:#333333;font-style:italic;">&ldquo;' + escapeHtml(ai.shareText || '') + '&rdquo;</div>' +
    '</div>' +
    '<a href="https://peakher.ai" style="display:inline-block;background:' + design.color + ';color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">Share This \u2192</a>' +
    '</div>' +
    '</td></tr>' +

    // ── 12. SIGN-OFF ──
    '<tr><td style="padding:0 24px 20px;">' +
    '<div style="background:#ffffff;border-radius:12px;padding:20px 24px;text-align:center;">' +
    '<div style="width:48px;height:48px;background:' + design.color + ';border-radius:50%;margin:0 auto 12px;line-height:48px;font-size:24px;">' + design.emoji + '</div>' +
    '<div style="font-size:14px;color:#555555;line-height:1.6;max-width:440px;margin:0 auto;">' + escapeHtml(signoff) + '</div>' +
    '<div style="font-size:14px;color:#333333;font-weight:600;margin-top:10px;">\u2014 Dot ' + design.emoji + '</div>' +
    '</div>' +
    '</td></tr>' +

    // ── FOOTER ──
    '<tr><td style="padding:20px 24px 32px;text-align:center;">' +
    '<div style="font-size:12px;color:#999999;line-height:1.8;">' +
    '<a href="https://peakher.ai/app/#settings" style="color:#999999;text-decoration:underline;">Manage preferences</a>' +
    ' &nbsp;\u2022&nbsp; ' +
    '<a href="https://peakher.ai/unsubscribe/" style="color:#999999;text-decoration:underline;">Unsubscribe</a>' +
    ' &nbsp;\u2022&nbsp; ' +
    '<a href="https://peakher.ai/privacy/" style="color:#999999;text-decoration:underline;">Privacy</a>' +
    '</div>' +
    '<div style="font-size:12px;color:' + design.color + ';font-weight:600;margin-top:8px;font-style:italic;">Your biology is the strategy.</div>' +
    '<div style="font-size:11px;color:#CCCCCC;margin-top:8px;">\u00A9 2026 High Performance Ventures LLC. All rights reserved.</div>' +
    '</td></tr>' +

    '</table></td></tr></table>' +
    '</body></html>';

  return html;
}


// ══════════════════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════════

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    var today = new Date().toISOString().split('T')[0];

    // 1. Fetch user profile
    var users = await sql`
      SELECT id, name, email, personas FROM users WHERE id = ${userId} LIMIT 1
    `;
    if (users.length === 0) return sendError(res, 404, 'User not found');
    var user = users[0];

    // 2. Fetch cycle profile
    var profiles = await sql`
      SELECT last_period_start, average_cycle_length, tracking_enabled,
             coach_voice, cycle_date_confidence
      FROM cycle_profiles WHERE user_id = ${userId} LIMIT 1
    `;
    var cycleProfile = profiles.length > 0 ? profiles[0] : null;

    if (!cycleProfile || !cycleProfile.tracking_enabled || !cycleProfile.last_period_start) {
      return sendError(res, 400, 'Cycle tracking not enabled. Enable cycle tracking first.');
    }

    // 3. Calculate cycle day and phase
    var lastPeriodStart = cycleProfile.last_period_start instanceof Date
      ? cycleProfile.last_period_start.toISOString().split('T')[0]
      : String(cycleProfile.last_period_start);
    var cycleLength = cycleProfile.average_cycle_length || 28;
    var cycleDay = calculateCycleDay(lastPeriodStart, cycleLength, today);
    var phase = getPhaseForCycleDay(cycleDay, cycleLength);

    // 4. Fetch today's check-in
    var todayCheckins = await sql`
      SELECT energy, confidence, sleep_quality, stress_level, notes
      FROM checkins WHERE user_id = ${userId} AND date = ${today} LIMIT 1
    `;
    var todayCheckin = todayCheckins.length > 0 ? todayCheckins[0] : null;

    // 5. Fetch today's calendar events
    var todayStart = today + 'T00:00:00Z';
    var todayEnd = today + 'T23:59:59Z';
    var todayEvents = [];
    try {
      todayEvents = await sql`
        SELECT title, start_time, end_time, event_type, estimated_importance, attendee_count, is_all_day
        FROM calendar_events
        WHERE user_id = ${userId}
          AND start_time >= ${todayStart}
          AND start_time <= ${todayEnd}
        ORDER BY start_time ASC
      `;
    } catch (calErr) {
      console.error('Calendar events fetch warning:', calErr.message);
    }

    // 6. Generate AI content (or fall back to static)
    var aiContent = await generateAIContent(phase, cycleDay, cycleLength, user.name, todayEvents, todayCheckin);
    if (!aiContent) {
      aiContent = getFallbackContent(phase);
    }

    // Ensure calendar items from events if AI didn't generate them
    if ((!aiContent.calendarItems || aiContent.calendarItems.length === 0) && todayEvents.length > 0) {
      aiContent.calendarItems = todayEvents.map(function(ev) {
        return {
          title: ev.title,
          time: ev.is_all_day ? 'All day' : formatEventTime(ev.start_time),
          energyTag: 'Neutral',
          advice: 'Check your briefing in the app for full phase-specific guidance.'
        };
      });
    }

    // 7. Build the email HTML
    var emailHtml = buildEmailHtml({
      phase: phase,
      cycleDay: cycleDay,
      cycleLength: cycleLength,
      userName: user.name,
      today: today,
      ai: aiContent
    });

    var subject = PHASE_SUBJECTS[phase] || PHASE_SUBJECTS.build;

    // 8. If POST with send=true, send the email
    if (req.method === 'POST') {
      var body = req.body || {};
      if (body.send === true) {
        if (!user.email) {
          return sendError(res, 400, 'User has no email address');
        }
        var sendResult = await sendEmail({
          to: user.email,
          subject: subject,
          html: emailHtml,
          firstName: user.name || ''
        });
        return res.status(200).json({
          sent: true,
          subject: subject,
          phase: phase,
          cycleDay: cycleDay,
          emailResult: sendResult
        });
      }
    }

    // 9. Return the generated email
    return res.status(200).json({
      subject: subject,
      phase: phase,
      cycleDay: cycleDay,
      html: emailHtml
    });

  } catch (err) {
    console.error('Email brief error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};

// Export helpers for cron usage
module.exports.buildEmailHtml = buildEmailHtml;
module.exports.generateAIContent = generateAIContent;
module.exports.getFallbackContent = getFallbackContent;
module.exports.calculateCycleDay = calculateCycleDay;
module.exports.getPhaseForCycleDay = getPhaseForCycleDay;
module.exports.getPhaseDayRange = getPhaseDayRange;
module.exports.getModeName = getModeName;
module.exports.getPhaseMapName = getPhaseMapName;
module.exports.PHASE_SUBJECTS = PHASE_SUBJECTS;
module.exports.PHASE_DESIGN = PHASE_DESIGN;
module.exports.formatEventTime = formatEventTime;
module.exports.parseDate = parseDate;
module.exports.formatDate = formatDate;
module.exports.addDays = addDays;
module.exports.escapeHtml = escapeHtml;
