/**
 * PeakHer Daily Briefing API
 *
 * GET /api/briefing — Returns today's personalized "cycle weather report."
 * Auth required. Calculates cycle phase from onboarding data (cycle_profiles)
 * and returns actionable guidance in Amanda's brand voice.
 */
const { getDb } = require('./_lib/db');
const { getUserId, sendError } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    var today = new Date().toISOString().split('T')[0];

    // 1. Fetch cycle profile
    var profiles = await sql`
      SELECT last_period_start, average_cycle_length, tracking_enabled
      FROM cycle_profiles WHERE user_id = ${userId} LIMIT 1
    `;
    var cycleProfile = profiles.length > 0 ? profiles[0] : null;

    // 2. Fetch today's check-in
    var todayCheckins = await sql`
      SELECT date, energy, confidence, sleep_quality, stress_level, cycle_day, cycle_phase, notes
      FROM checkins WHERE user_id = ${userId} AND date = ${today} LIMIT 1
    `;
    var todayCheckin = todayCheckins.length > 0 ? todayCheckins[0] : null;

    // 3. Fetch last 7 days of check-ins for trend context
    var sevenDaysAgo = addDays(today, -7);
    var recentCheckins = await sql`
      SELECT date, energy, confidence, sleep_quality, stress_level, cycle_day, cycle_phase
      FROM checkins WHERE user_id = ${userId} AND date >= ${sevenDaysAgo} AND date <= ${today}
      ORDER BY date DESC
    `;

    // 4. Fetch streak
    var streaks = await sql`
      SELECT current_streak, longest_streak, last_checkin_date
      FROM streaks WHERE user_id = ${userId} LIMIT 1
    `;
    var streak = streaks.length > 0 ? streaks[0] : { current_streak: 0, longest_streak: 0 };

    // 5. Build the briefing
    var trackingEnabled = cycleProfile && cycleProfile.tracking_enabled;
    var briefing;

    if (trackingEnabled && cycleProfile.last_period_start) {
      briefing = buildCycleBriefing(today, cycleProfile, todayCheckin, recentCheckins, streak);
    } else {
      briefing = buildGeneralBriefing(today, todayCheckin, recentCheckins, streak);
    }

    return res.status(200).json(briefing);
  } catch (err) {
    console.error('Briefing GET error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};


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


// ── Phase content (the core value) ──────────────────────────────────────

var PHASE_CONTENT = {
  reflect: {
    phase: 'reflect',
    phaseName: 'Reflect Mode',
    phaseEmoji: '\uD83C\uDF19',
    headlines: [
      'Rest is not laziness. It\'s strategy.',
      'Your uterus is doing the heavy lifting today. Give her some space.',
      'You\'re not broken. You\'re recalibrating.',
      'The world can wait. You\'re processing.'
    ],
    summaries: [
      'Energy is at its lowest point in your cycle, and that\'s by design. Your body is literally shedding and rebuilding. This is not the time to launch things \u2014 it\'s the time to see things clearly.',
      'Progesterone and estrogen are both at rock bottom right now. Your body is doing hard physical work even if you\'re sitting still. Honor that. The insights you get during this phase are gold \u2014 your intuition is at its sharpest.',
      'Think of this as your monthly system reboot. Everything slows down so your brain can process at a deeper level. The ideas that come to you now? Write them down. They\'re often your most honest and strategic ones.'
    ],
    recommendations: {
      work: {
        title: 'Work & Career',
        tip: 'Review, analyze, and think strategically. Your analytical brain is actually sharper right now \u2014 you\'re just lower energy. Don\'t start new things. Evaluate what\'s already in motion.',
        doThis: 'Audit your projects. Journal about what\'s working and what isn\'t. Do the deep-think work that gets lost in busy weeks.',
        skipThis: 'Launching new initiatives, networking events, or anything that requires you to be "on." Save it for Build mode.'
      },
      fitness: {
        title: 'Movement',
        tip: 'Walk. Stretch. Gentle yoga. Your cortisol is already elevated from the inflammatory process happening in your body \u2014 don\'t pile more stress on top.',
        doThis: 'A 20-minute walk outside, restorative yoga, foam rolling, or just dancing slowly in your kitchen',
        skipThis: 'HIIT, heavy lifting, or anything that leaves you wrecked. Your recovery capacity is at its lowest.'
      },
      nutrition: {
        title: 'Fuel',
        tip: 'You\'re literally losing iron right now. Eat like you mean it. Red meat, spinach, lentils, dark leafy greens. Your body needs rebuilding materials.',
        doThis: 'Iron-rich foods, warm meals, dark chocolate (yes, really \u2014 the magnesium helps with cramps), bone broth',
        skipThis: 'Restrictive dieting or skipping meals. Your body needs more fuel right now, not less.'
      },
      social: {
        title: 'Relationships',
        tip: 'Low-key hangouts only. Cancel anything that feels draining and don\'t feel guilty about it. Your hermit era is valid and temporary.',
        doThis: 'Couch hangs with your closest people, phone calls instead of dinners out, journaling about relationships',
        skipThis: 'Big parties, networking events, or emotionally heavy conversations you could have next week instead'
      }
    },
    todayEnergy: 'low',
    energyForecast: 'rebuilding',
    funFacts: [
      'During menstruation, the right hemisphere of your brain becomes more active. That\'s why your intuition and creative insights feel sharper \u2014 it\'s literally brain chemistry, not woo-woo.',
      'Your pain threshold is actually lowest right now, which is why everything feels more intense. It\'s not in your head. Well, technically it is \u2014 it\'s in your neural pain processing centers.',
      'Research shows that women make more accurate gut-feeling decisions during menstruation. Your filter for BS is at maximum strength right now.'
    ]
  },

  build: {
    phase: 'build',
    phaseName: 'Build Mode',
    phaseEmoji: '\uD83D\uDE80',
    headlines: [
      'Your brain is in creative overdrive today.',
      'Today\'s vibe: say yes to everything.',
      'Estrogen is rising and so are you.',
      'Your starter pistol just fired. Go build something.'
    ],
    summaries: [
      'Energy is climbing. Estrogen is rising. Your brain is primed for new ideas, new projects, new everything. Don\'t waste this on routine tasks \u2014 this is your innovation window.',
      'Welcome to your creative peak. Rising estrogen is boosting your verbal fluency, spatial reasoning, and ability to learn new things. If there\'s a skill you\'ve wanted to pick up or a project you\'ve been putting off, now is literally the optimal time.',
      'Your body is building toward ovulation and your brain is along for the ride. Neurotransmitters are firing, energy is compounding daily, and your tolerance for novelty is sky-high. Use this.'
    ],
    recommendations: {
      work: {
        title: 'Work & Career',
        tip: 'Brainstorm. Pitch ideas. Start that project you\'ve been putting off. Your brain is literally wired for creativity right now \u2014 novel neural connections are forming faster than any other phase.',
        doThis: 'Schedule the meeting where you propose something new. Write the first draft. Map out the strategy. Start the thing.',
        skipThis: 'Mindless admin tasks \u2014 save those for Complete mode when your brain actually craves detail work.'
      },
      fitness: {
        title: 'Movement',
        tip: 'Go hard. Your body can handle high-intensity today. Your muscle-building capacity is peaking and your recovery time is faster. Try that new class. Push your limits.',
        doThis: 'HIIT, running, dance cardio, trying a new sport, anything that challenges you and gets your heart rate up',
        skipThis: 'Gentle yoga only sessions (save those for Reflect mode \u2014 right now you\'d just be bored)'
      },
      nutrition: {
        title: 'Fuel',
        tip: 'Light proteins and fermented foods. Your gut microbiome is thriving and your metabolism is efficient. This is the phase where lighter meals feel satisfying.',
        doThis: 'Try new cuisines, eat colorful plates, fermented foods (kimchi, yogurt, kombucha), lean proteins',
        skipThis: 'Heavy comfort foods \u2014 that\'s a Complete mode craving and you don\'t need it right now'
      },
      social: {
        title: 'Relationships',
        tip: 'Your social battery is fully charged and climbing. Say yes to plans. Reconnect with people you\'ve been meaning to reach out to. Your communication skills are peaking.',
        doThis: 'Schedule coffee dates, networking events, team brainstorms, social outings you\'ve been putting off',
        skipThis: 'Hermit mode \u2014 that comes later in your cycle and it\'s valid then, but right now you\'d be wasting your social superpowers'
      }
    },
    todayEnergy: 'rising',
    energyForecast: 'high',
    funFacts: [
      'During your follicular phase, rising estrogen boosts verbal fluency and creative problem-solving. It\'s literally brain chemistry, not motivation.',
      'Your brain forms new neural connections faster during this phase than any other. Whatever you learn or practice now will stick better. It\'s your neuroplasticity sweet spot.',
      'Estrogen increases dopamine receptor sensitivity, which is why new experiences feel extra rewarding right now. Your brain is literally designed to seek novelty this week.'
    ]
  },

  perform: {
    phase: 'perform',
    phaseName: 'Perform Mode',
    phaseEmoji: '\u2B50',
    headlines: [
      'You\'re magnetic today. Use it.',
      'Main character energy: activated.',
      'This is your moment. Don\'t play small.',
      'Peak everything. Go be undeniable.'
    ],
    summaries: [
      'Estrogen just peaked and testosterone is surging alongside it. You are at your most confident, articulate, and physically capable right now. This window is short \u2014 2 to 3 days \u2014 so use it strategically.',
      'Your verbal skills, social confidence, and physical performance are all at their monthly peak. This is the phase where you close deals, crush presentations, and have conversations that change things. Don\'t waste it on busywork.',
      'Biology just handed you a cheat code. Testosterone and estrogen are both peaking, giving you a rare combination of confidence, eloquence, and physical power. The hard conversations, the big asks, the bold moves \u2014 this is when you make them.'
    ],
    recommendations: {
      work: {
        title: 'Work & Career',
        tip: 'Close deals. Give presentations. Have the hard conversations. Your communication skills are at their absolute peak and your confidence to back them up is too. This is your 2-3 day power window.',
        doThis: 'The salary negotiation. The client pitch. The difficult feedback conversation. The podcast interview. Go.',
        skipThis: 'Hiding behind your laptop doing solo work. That\'s a waste of your peak social and persuasion power.'
      },
      fitness: {
        title: 'Movement',
        tip: 'Go all out. Heavy lifting, competitive sports, group fitness classes where you push for a personal best. Your physical performance peaks with ovulation \u2014 you can literally lift more weight this week.',
        doThis: 'Lift heavy, sprint, compete, take the hardest class on the schedule, set a PR',
        skipThis: 'Taking it easy. Your body is designed for peak output right now. There\'s time to rest soon enough.'
      },
      nutrition: {
        title: 'Fuel',
        tip: 'Anti-inflammatory foods and raw veggies. Your metabolism is at its fastest and your body processes nutrients most efficiently right now. Lighter meals will keep you sharp.',
        doThis: 'Big colorful salads, raw vegetables, anti-inflammatory foods (turmeric, berries, fatty fish), lighter meals',
        skipThis: 'Skipping meals to "stay sharp" \u2014 your brain needs fuel even when your appetite is lower'
      },
      social: {
        title: 'Relationships',
        tip: 'You\'re the life of the party and people are literally more attracted to you right now (research confirms this). Schedule date nights, important conversations, and anything where charisma matters.',
        doThis: 'Date night, networking power moves, the conversation you\'ve been avoiding, ask for what you want',
        skipThis: 'Canceling plans. Your social magnetism is peaking \u2014 lean into it.'
      }
    },
    todayEnergy: 'peak',
    energyForecast: 'maximum',
    funFacts: [
      'Testosterone peaks alongside estrogen during ovulation, boosting both your confidence and assertiveness. It\'s not cockiness \u2014 it\'s biochemistry.',
      'Research shows that people perceive women as more attractive during ovulation \u2014 your voice pitch subtly changes, your skin glows more, and your body language becomes more open. You\'re not imagining it.',
      'Your pain tolerance is at its highest right now, your reaction time is fastest, and your spatial awareness peaks. If you\'ve ever wanted to try something physically challenging, today is the day.'
    ]
  },

  complete: {
    phase: 'complete',
    phaseName: 'Complete Mode',
    phaseEmoji: '\uD83C\uDFAF',
    headlines: [
      'Finish what you started. Don\'t start anything new.',
      'You\'re not losing motivation. Your hormones are just shifting gears.',
      'Detail mode: activated. Use it before it uses you.',
      'Your inner project manager just clocked in.'
    ],
    summaries: [
      'Progesterone is running the show now, and it wants closure. Your brain is shifting from "create new things" to "finish existing things." This is not a slump \u2014 it\'s a different kind of productivity. Ride it.',
      'Energy is starting to taper and that\'s normal. Progesterone makes you more detail-oriented, more focused on completion, and less tolerant of chaos. Channel that into wrapping up loose ends instead of fighting it.',
      'Your brain chemistry just flipped from novelty-seeking to completion-seeking. Those half-finished projects, overdue follow-ups, and messy inboxes? Your brain actually wants to tackle them right now. Let it.'
    ],
    recommendations: {
      work: {
        title: 'Work & Career',
        tip: 'Detail work, admin, follow-ups, and finishing. Your brain wants closure, not novelty. That report you\'ve been avoiding? Your progesterone-fueled detail orientation will actually make it easier now.',
        doThis: 'Close out projects, send follow-up emails, organize your files, do the tedious-but-necessary tasks',
        skipThis: 'Starting brand new initiatives. Your brain will resist novelty right now and that resistance is useful \u2014 it means you\'ll actually finish things for once.'
      },
      fitness: {
        title: 'Movement',
        tip: 'Moderate is the move. Pilates, swimming, steady-state cardio, long walks. Your cortisol is already elevated from progesterone \u2014 adding high-intensity stress is counterproductive.',
        doThis: 'Pilates, swimming, hiking, moderate strength training, long walks with a podcast',
        skipThis: 'Intense HIIT or pushing for PRs. Your body is preparing for potential pregnancy (even if you\'re not) and recovery takes longer right now.'
      },
      nutrition: {
        title: 'Fuel',
        tip: 'Complex carbs, magnesium-rich foods, and yes \u2014 those cravings are real and valid. Progesterone increases your metabolic rate by 5-10%, so you actually need more calories this week.',
        doThis: 'Dark chocolate (magnesium), sweet potatoes, nuts, whole grains, warming foods. Eat when you\'re hungry.',
        skipThis: 'Beating yourself up about cravings or restricting. Your body literally needs 100-300 more calories per day right now.'
      },
      social: {
        title: 'Relationships',
        tip: 'Smaller groups, deeper conversations. Your tolerance for surface-level socializing drops and your need for meaningful connection rises. Quality over quantity.',
        doThis: 'One-on-one dinners, deep conversations, quality time with your inner circle, setting boundaries',
        skipThis: 'Big group events or anything that requires sustained "on" energy. You\'ll resent it and everyone will notice.'
      }
    },
    todayEnergy: 'tapering',
    energyForecast: 'moderate-to-low',
    funFacts: [
      'Progesterone dominance actually enhances your detail-orientation and follow-through. That urge to organize your entire house? It\'s hormonal. And productive. Go with it.',
      'Your metabolic rate increases 5-10% during the luteal phase, which is why you\'re hungrier. Those cravings aren\'t weakness \u2014 they\'re your body requesting the extra fuel it genuinely needs.',
      'The "nesting instinct" you might feel isn\'t just for pregnant women. Progesterone makes everyone want to organize, clean, and create order. Your brain is literally tidying up before the cycle resets.'
    ]
  }
};


// ── Briefing builders ───────────────────────────────────────────────────

function buildCycleBriefing(today, cycleProfile, todayCheckin, recentCheckins, streak) {
  var lastPeriodStart = cycleProfile.last_period_start instanceof Date
    ? cycleProfile.last_period_start.toISOString().split('T')[0]
    : String(cycleProfile.last_period_start);
  var cycleLength = cycleProfile.average_cycle_length || 28;
  var cycleDay = calculateCycleDay(lastPeriodStart, cycleLength, today);
  var phase = getPhaseForCycleDay(cycleDay, cycleLength);
  var content = PHASE_CONTENT[phase] || PHASE_CONTENT.build;

  // Pick headline variation based on cycle day within the phase
  var phaseRange = getPhaseDayRange(phase, cycleLength);
  var dayWithinPhase = cycleDay - phaseRange.start;
  var headlineIndex = dayWithinPhase % content.headlines.length;
  var summaryIndex = dayWithinPhase % content.summaries.length;
  var funFactIndex = dayWithinPhase % content.funFacts.length;

  // Build personalization from recent check-ins
  var personalization = buildPersonalization(todayCheckin, recentCheckins);

  // Build streak info
  var currentStreak = streak.current_streak || 0;
  var streakMessage = getStreakMessage(currentStreak);

  var briefing = {
    date: today,
    cycleDay: cycleDay,
    totalCycleDays: cycleLength,
    phase: phase,
    phaseName: content.phaseName,
    phaseEmoji: content.phaseEmoji,
    phaseDayRange: phaseRange,
    headline: content.headlines[headlineIndex],
    summary: content.summaries[summaryIndex],
    recommendations: content.recommendations,
    todayEnergy: content.todayEnergy,
    energyForecast: content.energyForecast,
    funFact: content.funFacts[funFactIndex],
    streakInfo: {
      current: currentStreak,
      message: streakMessage
    },
    hasCheckedInToday: !!todayCheckin,
    checkinPrompt: todayCheckin
      ? null
      : 'Quick check-in? Two sliders, 10 seconds. Your data gets smarter every day.',
    trackingEnabled: true
  };

  // Add personalization if we have check-in data
  if (personalization) {
    briefing.personalization = personalization;
  }

  return briefing;
}

function buildGeneralBriefing(today, todayCheckin, recentCheckins, streak) {
  var dayOfWeek = parseDate(today).getDay();
  var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var dayName = dayNames[dayOfWeek];

  // Day-of-week based guidance
  var dayContent = getDayOfWeekContent(dayOfWeek);

  // Build personalization from recent check-ins
  var personalization = buildPersonalization(todayCheckin, recentCheckins);

  var currentStreak = streak.current_streak || 0;
  var streakMessage = getStreakMessage(currentStreak);

  var headline = dayContent.headline;
  var summary = dayContent.summary;
  var tip = dayContent.tip;

  // If we have recent check-in trends, override with those
  if (recentCheckins.length >= 3) {
    var energies = recentCheckins.map(function (c) { return Number(c.energy); });
    var avgEnergy = energies.reduce(function (a, b) { return a + b; }, 0) / energies.length;
    var recentTrend = energies.length >= 2 ? energies[0] - energies[energies.length - 1] : 0;

    if (recentTrend > 1.5) {
      headline = 'Your energy has been climbing. Ride the wave.';
      summary = 'Over the last ' + recentCheckins.length + ' check-ins, your energy is trending up. Whatever you\'re doing, keep doing it. Today is a good day to tackle something ambitious.';
    } else if (recentTrend < -1.5) {
      headline = 'Energy\'s been dipping. Time to recharge.';
      summary = 'Your recent check-ins show a downward energy trend. That\'s not failure \u2014 it\'s data. Today, prioritize rest, light movement, and things that fill your cup.';
    } else if (avgEnergy >= 7) {
      headline = 'You\'re in a high-energy stretch. Make it count.';
      summary = 'Your average energy over the last week is ' + Math.round(avgEnergy * 10) / 10 + '/10. You\'re in the zone. Schedule the hard stuff today.';
    } else if (avgEnergy <= 4) {
      headline = 'Running on fumes? Let\'s be strategic about it.';
      summary = 'Your energy has been averaging ' + Math.round(avgEnergy * 10) / 10 + '/10 lately. Instead of pushing through, work with your body. Low-energy tasks, early bedtime, and permission to say no.';
    }
  }

  var briefing = {
    date: today,
    cycleDay: null,
    totalCycleDays: null,
    phase: null,
    phaseName: dayName,
    phaseEmoji: dayContent.emoji,
    phaseDayRange: null,
    headline: headline,
    summary: summary,
    recommendations: {
      work: {
        title: 'Work & Career',
        tip: tip,
        doThis: dayContent.doThis,
        skipThis: dayContent.skipThis
      },
      fitness: {
        title: 'Movement',
        tip: dayContent.fitnessTip,
        doThis: dayContent.fitnessDoThis,
        skipThis: dayContent.fitnessSkipThis
      },
      nutrition: {
        title: 'Fuel',
        tip: dayContent.nutritionTip,
        doThis: dayContent.nutritionDoThis,
        skipThis: dayContent.nutritionSkipThis
      },
      social: {
        title: 'Relationships',
        tip: dayContent.socialTip,
        doThis: dayContent.socialDoThis,
        skipThis: dayContent.socialSkipThis
      }
    },
    todayEnergy: dayContent.energy,
    energyForecast: dayContent.forecast,
    funFact: dayContent.funFact,
    streakInfo: {
      current: currentStreak,
      message: streakMessage
    },
    hasCheckedInToday: !!todayCheckin,
    checkinPrompt: todayCheckin
      ? null
      : 'Quick check-in? Two sliders, 10 seconds. Your data gets smarter every day.',
    trackingEnabled: false,
    cycleTrackingCTA: 'Want guidance tailored to your cycle? Enable cycle tracking in your profile for a daily briefing that knows exactly where you are in your month.'
  };

  if (personalization) {
    briefing.personalization = personalization;
  }

  return briefing;
}


// ── Personalization from check-in data ──────────────────────────────────

function buildPersonalization(todayCheckin, recentCheckins) {
  if (!recentCheckins || recentCheckins.length === 0) return null;

  var energies = [];
  var confidences = [];
  var sleepScores = [];
  var stressScores = [];

  for (var i = 0; i < recentCheckins.length; i++) {
    var c = recentCheckins[i];
    energies.push(Number(c.energy));
    confidences.push(Number(c.confidence));
    if (c.sleep_quality != null) sleepScores.push(Number(c.sleep_quality));
    if (c.stress_level != null) stressScores.push(Number(c.stress_level));
  }

  var result = {
    recentDays: recentCheckins.length,
    avgEnergy: round1(avg(energies)),
    avgConfidence: round1(avg(confidences))
  };

  if (sleepScores.length > 0) {
    result.avgSleep = round1(avg(sleepScores));
  }
  if (stressScores.length > 0) {
    result.avgStress = round1(avg(stressScores));
  }

  // Trend: compare first half to second half
  if (energies.length >= 4) {
    var half = Math.floor(energies.length / 2);
    var recentHalf = avg(energies.slice(0, half));
    var olderHalf = avg(energies.slice(half));
    var diff = recentHalf - olderHalf;
    if (diff > 0.5) {
      result.energyTrend = 'rising';
      result.trendNote = 'Your energy has been climbing over the last week. Keep doing what you\'re doing.';
    } else if (diff < -0.5) {
      result.energyTrend = 'falling';
      result.trendNote = 'Your energy has been dipping lately. Prioritize sleep and recovery.';
    } else {
      result.energyTrend = 'stable';
      result.trendNote = 'Your energy has been steady this week. Consistency is underrated.';
    }
  }

  // Today-specific note if they checked in
  if (todayCheckin) {
    var e = Number(todayCheckin.energy);
    var conf = Number(todayCheckin.confidence);
    if (e >= 8 && conf >= 8) {
      result.todayNote = 'You\'re feeling strong today. Capitalize on it \u2014 this is a power day.';
    } else if (e <= 3 || conf <= 3) {
      result.todayNote = 'Tough day. That\'s real and valid. Be gentle with yourself and do less, not more.';
    } else if (e >= 7) {
      result.todayNote = 'Energy is solid today. You\'ve got fuel in the tank \u2014 use it on something meaningful.';
    } else if (conf >= 7) {
      result.todayNote = 'Confidence is high even if energy isn\'t peak. Trust your gut on decisions today.';
    }
  }

  return result;
}


// ── Day-of-week content (for non-cycle-tracking users) ──────────────────

function getDayOfWeekContent(dayOfWeek) {
  var content = {
    0: { // Sunday
      headline: 'Sunday is for strategy, not scrambling.',
      summary: 'The most productive people use Sunday to think, not to grind. Review your week, set intentions, and protect your energy for Monday.',
      emoji: '\uD83C\uDF1F',
      energy: 'restorative',
      forecast: 'building-for-monday',
      tip: 'Review last week. Plan this week. Don\'t start anything new \u2014 just map out where your energy should go.',
      doThis: 'Weekly review, intention setting, meal prep, calendar audit',
      skipThis: 'Catching up on work emails. That\'s Monday\'s problem.',
      fitnessTip: 'Movement that feels good, not punishing. Think long walk, swim, or yoga.',
      fitnessDoThis: 'Nature walk, gentle yoga, swimming, stretching',
      fitnessSkipThis: 'Brutal workout that leaves you drained for Monday',
      nutritionTip: 'Meal prep is a power move. Set yourself up to eat well all week.',
      nutritionDoThis: 'Prep meals, try a new recipe, hydrate like your life depends on it',
      nutritionSkipThis: 'Restrictive eating or skipping meals to "make up" for the weekend',
      socialTip: 'Low-key quality time. Sunday is for your inner circle.',
      socialDoThis: 'Brunch with close friends, family time, a good phone call',
      socialSkipThis: 'Doom scrolling instead of actual human connection',
      funFact: 'Studies show that spending 30 minutes on Sunday planning your week reduces weekday stress by up to 30%. Your future self will thank you.'
    },
    1: { // Monday
      headline: 'Monday sets the tone. Make it count.',
      summary: 'Your willpower is highest at the start of the week. Use it on the hardest thing first. Don\'t let email eat your best hours.',
      emoji: '\u26A1',
      energy: 'fresh',
      forecast: 'high-potential',
      tip: 'Tackle your most important task before 11am. Willpower depletes throughout the day and week.',
      doThis: 'The one task you\'ve been avoiding. The big presentation prep. The strategic work.',
      skipThis: 'Starting with email. It\'s a trap that makes you feel productive while accomplishing nothing important.',
      fitnessTip: 'Set the tone with a strong workout. Monday movement predicts the rest of your week.',
      fitnessDoThis: 'Your hardest workout of the week. Strength training, running, high-intensity class.',
      fitnessSkipThis: 'Skipping because you\'re "too busy." 30 minutes now saves you hours of low energy later.',
      nutritionTip: 'Protein-heavy breakfast. Your brain needs fuel for decision-making.',
      nutritionDoThis: 'Eggs, protein smoothie, overnight oats with nuts. Something substantial.',
      nutritionSkipThis: 'Coffee as a meal. Caffeine is not a macronutrient.',
      socialTip: 'Set boundaries early. How you communicate on Monday defines your week.',
      socialDoThis: 'Clear communication about priorities, check in with your team, set expectations',
      socialSkipThis: 'Saying yes to every meeting request that lands in your inbox',
      funFact: 'Research shows that cognitive function and self-regulation are highest on Monday mornings. Your brain is literally at its weekly peak right now.'
    },
    2: { // Tuesday
      headline: 'Tuesday is secretly the most productive day of the week.',
      summary: 'Monday\'s warm-up is done. You\'re in the zone. This is statistically the day people accomplish the most. Don\'t waste it.',
      emoji: '\uD83D\uDD25',
      energy: 'peak-week',
      forecast: 'high',
      tip: 'Deep work time. Block 2-3 hours for your most important creative or strategic project.',
      doThis: 'Deep work sessions, creative projects, strategy development, hard problem-solving',
      skipThis: 'Back-to-back meetings. Protect at least one 2-hour block for real work.',
      fitnessTip: 'Your body and mind are both warmed up. Great day for trying something new.',
      fitnessDoThis: 'That class you\'ve been curious about, a new running route, strength training',
      fitnessSkipThis: 'Sitting all day. Even a 15-minute walk between tasks keeps your brain sharp.',
      nutritionTip: 'Brain fuel for deep work. Omega-3s, complex carbs, steady energy.',
      nutritionDoThis: 'Salmon, avocado, nuts, berries. Foods that support sustained focus.',
      nutritionSkipThis: 'Sugar crashes. That 2pm candy bar will tank your productivity.',
      socialTip: 'Collaborative energy is high. Great day for brainstorms and creative conversations.',
      socialDoThis: 'Team brainstorms, collaborative projects, mentoring conversations',
      socialSkipThis: 'Working in isolation if you could be bouncing ideas off someone',
      funFact: 'A 10,000-person study found that Tuesday is the most productive day of the work week, with output dropping steadily through Friday. You\'re in prime time.'
    },
    3: { // Wednesday
      headline: 'Midweek check: are you doing the right things, or just doing things?',
      summary: 'Wednesday is your midweek compass. You still have momentum but the week is tipping. Reassess priorities and make sure you\'re spending energy on what actually matters.',
      emoji: '\uD83E\uDDED',
      energy: 'steady',
      forecast: 'moderate-high',
      tip: 'Midweek review. Are your priorities from Monday still the right ones? Adjust before Thursday.',
      doThis: 'Priority check, follow-ups on Monday/Tuesday work, course corrections',
      skipThis: 'Autopilot mode. Wednesday is where weeks go off the rails without a check-in.',
      fitnessTip: 'Mid-intensity. Keep the momentum without burning out before the weekend.',
      fitnessDoThis: 'Moderate strength training, a solid run, pilates, swimming',
      fitnessSkipThis: 'Skipping to "save energy for the weekend." Consistency beats intensity.',
      nutritionTip: 'Hydration check. Most people are chronically dehydrated by midweek.',
      nutritionDoThis: 'Extra water, electrolytes, balanced meals. Check in with your hunger.',
      nutritionSkipThis: 'Relying on caffeine to power through. It\'s masking the signals your body is sending.',
      socialTip: 'Check in on the people who matter. Midweek is when connections get neglected.',
      socialDoThis: 'Send that text you\'ve been putting off, lunch with a colleague, quick catch-up call',
      socialSkipThis: 'Isolating because you\'re "too busy." Connection is fuel, not distraction.',
      funFact: 'Neuroscience shows that a brief midweek reflection activates your prefrontal cortex and improves decision-making for the rest of the week. This check-in is literally making you smarter.'
    },
    4: { // Thursday
      headline: 'Thursday: close the loops before they haunt your weekend.',
      summary: 'The weekend is visible from here. Use today to wrap up everything that could become a source of Sunday-night anxiety. Your future self is begging you.',
      emoji: '\uD83C\uDFAF',
      energy: 'focused',
      forecast: 'moderate',
      tip: 'Completion mode. What can you finish today so it\'s not hanging over your weekend?',
      doThis: 'Close out projects, send follow-ups, make the decisions you\'ve been deferring',
      skipThis: 'Starting a big new project that you can\'t finish before Friday.',
      fitnessTip: 'Steady effort. Keep showing up without overdoing it.',
      fitnessDoThis: 'Your regular workout routine. Consistency is the whole game.',
      fitnessSkipThis: 'Going so hard you can\'t move Friday. Save the heroics for peak days.',
      nutritionTip: 'Nourish, don\'t just fuel. Your body has been working hard all week.',
      nutritionDoThis: 'Nutrient-dense meals, vegetables, protein. Treat your body like it\'s earned it.',
      nutritionSkipThis: 'Takeout because you\'re tired. That effort to cook will pay off in how you feel.',
      socialTip: 'Make weekend plans if you haven\'t already. Anticipation boosts happiness.',
      socialDoThis: 'Confirm weekend plans, reach out to a friend, plan something you\'ll look forward to',
      socialSkipThis: 'Leaving the weekend completely unplanned. Some structure prevents the Sunday scaries.',
      funFact: 'Psychologists found that simply having plans for the weekend increases Thursday happiness by up to 20%. Anticipation is a free mood booster.'
    },
    5: { // Friday
      headline: 'Wrap it up. Your weekend doesn\'t earn itself.',
      summary: 'Finish strong, plan light. Friday is for tying up loose ends, doing your weekly review, and protecting your weekend from the "I\'ll just do a little work" trap.',
      emoji: '\uD83C\uDF89',
      energy: 'winding-down',
      forecast: 'moderate-to-low',
      tip: 'Weekly review and loose ends. What needs to be done before you can actually relax this weekend?',
      doThis: 'Inbox zero attempt, weekly review, prep Monday\'s priorities, tie up loose ends',
      skipThis: 'Starting something ambitious that\'ll live in your head all weekend.',
      fitnessTip: 'Fun movement. Friday workouts should feel like play, not punishment.',
      fitnessDoThis: 'Dance class, a fun run, pickup sports, anything that makes you smile',
      fitnessSkipThis: 'Guilt-driven exercise. If you\'re dragging, a walk is perfectly productive.',
      nutritionTip: 'Enjoy yourself. If you\'ve fueled well all week, Friday is not the time to be rigid.',
      nutritionDoThis: 'That restaurant you\'ve been wanting to try. Cooking something indulgent. Social meals.',
      nutritionSkipThis: 'Skipping dinner because you\'re going out later. Eat real food first.',
      socialTip: 'Transition from work mode to human mode. Connect with people you care about.',
      socialDoThis: 'Happy hour (if that\'s your thing), dinner with friends, quality time with your partner',
      socialSkipThis: 'Working late "just this once." The pattern is the problem.',
      funFact: 'Your brain consolidates learning and experiences during rest. The weekend isn\'t wasted time \u2014 it\'s when your brain integrates everything you learned this week into long-term memory.'
    },
    6: { // Saturday
      headline: 'Recharge or play. The only wrong answer is working.',
      summary: 'Your brain needs actual rest to perform well next week. That doesn\'t mean doing nothing \u2014 it means doing things that refill your tank instead of drain it.',
      emoji: '\u2600\uFE0F',
      energy: 'restorative',
      forecast: 'recharging',
      tip: 'No work. Seriously. Do something that makes you feel alive, not productive.',
      doThis: 'The hobby you\'ve been neglecting, time outdoors, creative projects for fun',
      skipThis: 'Checking Slack. Answering emails. "Just a quick look at that report." No.',
      fitnessTip: 'Adventure movement. Hike, swim, bike, explore. Make it an experience, not a workout.',
      fitnessDoThis: 'Hiking, outdoor activities, playing a sport for fun, exploring somewhere new',
      fitnessSkipThis: 'Your regular gym routine. Saturday movement should feel different from weekdays.',
      nutritionTip: 'Intuitive eating. Listen to what your body actually wants today.',
      nutritionDoThis: 'Farmers market visit, cooking something just because, eating slowly and enjoying it',
      nutritionSkipThis: 'Tracking macros on a Saturday. Give your brain a break from optimization.',
      socialTip: 'Full presence. Put your phone away and actually be with the people around you.',
      socialDoThis: 'Quality time without screens, adventures with friends or family, new experiences together',
      socialSkipThis: 'Saying no to everything because you need to "recover." Connection IS recovery for most people.',
      funFact: 'Research on high performers shows that the #1 predictor of sustained excellence isn\'t work ethic \u2014 it\'s recovery quality. The best performers are the best resters.'
    }
  };

  return content[dayOfWeek] || content[1];
}


// ── Streak messages ─────────────────────────────────────────────────────

function getStreakMessage(currentStreak) {
  if (currentStreak === 0) {
    return 'Start a new streak today. One check-in is all it takes.';
  }
  if (currentStreak === 1) {
    return 'Day 1. Every streak starts here. Come back tomorrow to make it 2.';
  }
  if (currentStreak === 2) {
    return '2 days in a row. You\'re building a habit. One more and it\'s a streak.';
  }
  if (currentStreak <= 5) {
    return currentStreak + ' days strong. Your future self is going to thank you.';
  }
  if (currentStreak <= 10) {
    return currentStreak + ' days. You\'re in the habit zone now. This data is starting to tell a story.';
  }
  if (currentStreak <= 20) {
    return currentStreak + ' days. Most people never get here. Your pattern data is getting seriously useful.';
  }
  if (currentStreak <= 30) {
    return currentStreak + ' days. A full month of showing up for yourself. That\'s not discipline \u2014 that\'s identity.';
  }
  if (currentStreak <= 60) {
    return currentStreak + ' days. You\'re in the top 1% of self-awareness. Your data is rich enough to predict your best days.';
  }
  return currentStreak + ' days. At this point you\'re basically a scientist studying yourself. Respect.';
}


// ── Mini briefing for email/push (exported for cron) ────────────────────

function getMiniPhraseBriefing(lastPeriodStart, cycleLength, dateStr) {
  var cycleDay = calculateCycleDay(lastPeriodStart, cycleLength, dateStr);
  if (!cycleDay) return null;
  var phase = getPhaseForCycleDay(cycleDay, cycleLength);
  var content = PHASE_CONTENT[phase];
  if (!content) return null;

  var miniPhrases = {
    reflect: 'You\'re in Reflect mode today \u2014 your intuition is sharpest now. Check in to keep tracking your rhythm.',
    build: 'You\'re in Build mode today \u2014 your brain is primed for creativity. Check in to keep your streak alive.',
    perform: 'You\'re in Perform mode today \u2014 peak confidence and communication. Check in to capture your peak.',
    complete: 'You\'re in Complete mode today \u2014 perfect for finishing what you started. Check in to keep the data flowing.'
  };

  return {
    phase: phase,
    phaseName: content.phaseName,
    phaseEmoji: content.phaseEmoji,
    miniPhrase: miniPhrases[phase] || miniPhrases.build
  };
}


// ── Utility ─────────────────────────────────────────────────────────────

function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  var sum = 0;
  for (var i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}


// ── Exports (for cron usage) ────────────────────────────────────────────

module.exports.getMiniPhraseBriefing = getMiniPhraseBriefing;
module.exports.calculateCycleDay = calculateCycleDay;
module.exports.getPhaseForCycleDay = getPhaseForCycleDay;
module.exports.PHASE_CONTENT = PHASE_CONTENT;
