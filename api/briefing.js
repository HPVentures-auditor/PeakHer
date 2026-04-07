/**
 * PeakHer Daily Briefing API, v3 (Dot-powered)
 *
 * GET /api/briefing. Returns today's personalized "cycle weather report."
 * Auth required. Calculates cycle phase from onboarding data (cycle_profiles)
 * and generates a rich, multi-domain daily briefing using Claude AI with
 * comprehensive phase-specific knowledge.
 *
 * Dot is PeakHer's single AI voice with phase-adjusted tone:
 *   - Restore: gentle, protective
 *   - Rise: energized, encouraging
 *   - Peak: hyped, confident
 *   - Sustain: warm, grounded, practical
 *
 * Supports:
 *   - cycle_date_confidence: 'exact' | 'estimated' (default: 'estimated')
 *   - Rich day-1 briefings (no check-in history required)
 *   - Structured JSON output with calendar intelligence, nutrition, movement,
 *     fasting, focus, emotional weather, hormone download, and Dot sign-offs
 *   - Luteal emotional toolkit with proactive late-luteal support
 *   - Backward-compatible with v2 frontend fields
 */
var { getDb } = require('./_lib/db');
var { getUserId, sendError } = require('./_lib/auth');
var { sendMessage } = require('./_lib/claude');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    var today = new Date().toISOString().split('T')[0];

    // 1. Fetch user profile
    var users = await sql`
      SELECT name, personas FROM users WHERE id = ${userId} LIMIT 1
    `;
    var user = users.length > 0 ? users[0] : { name: '', personas: [] };

    // 2. Fetch cycle profile
    var profiles = await sql`
      SELECT last_period_start, average_cycle_length, tracking_enabled,
             cycle_date_confidence
      FROM cycle_profiles WHERE user_id = ${userId} LIMIT 1
    `;
    var cycleProfile = profiles.length > 0 ? profiles[0] : null;

    // 3. Fetch today's check-in
    var todayCheckins = await sql`
      SELECT date, energy, confidence, sleep_quality, stress_level, cycle_day, cycle_phase, notes
      FROM checkins WHERE user_id = ${userId} AND date = ${today} LIMIT 1
    `;
    var todayCheckin = todayCheckins.length > 0 ? todayCheckins[0] : null;

    // 4. Fetch last 7 days of check-ins for trend context
    var sevenDaysAgo = addDays(today, -7);
    var recentCheckins = await sql`
      SELECT date, energy, confidence, sleep_quality, stress_level, cycle_day, cycle_phase
      FROM checkins WHERE user_id = ${userId} AND date >= ${sevenDaysAgo} AND date <= ${today}
      ORDER BY date DESC
    `;

    // 5. Fetch streak
    var streaks = await sql`
      SELECT current_streak, longest_streak, last_checkin_date
      FROM streaks WHERE user_id = ${userId} LIMIT 1
    `;
    var streak = streaks.length > 0 ? streaks[0] : { current_streak: 0, longest_streak: 0 };

    // 6. Fetch today's and this week's calendar events
    var todayStart = today + 'T00:00:00Z';
    var todayEnd = today + 'T23:59:59Z';
    var weekEndDate = addDays(today, 7);
    var weekEnd = weekEndDate + 'T23:59:59Z';

    var calendarEvents = [];
    try {
      calendarEvents = await sql`
        SELECT title, start_time, end_time, event_type, estimated_importance, attendee_count, is_all_day
        FROM calendar_events
        WHERE user_id = ${userId}
          AND start_time >= ${todayStart}
          AND start_time <= ${weekEnd}
        ORDER BY start_time ASC
      `;
    } catch (calErr) {
      // Calendar table may not exist yet — gracefully degrade
      console.error('Calendar events fetch warning:', calErr.message);
    }

    // 7. Fetch recent wearable data (last 7 days)
    var sevenDaysAgo2 = addDays(today, -7);
    var wearableData = [];
    try {
      wearableData = await sql`
        SELECT date, provider, hrv_avg, hrv_max, resting_hr,
               sleep_duration_min, sleep_quality_score, deep_sleep_min, rem_sleep_min,
               sleep_efficiency, recovery_score, readiness_score, strain_score,
               stress_avg, body_battery_start, body_battery_end, steps,
               calories_active, skin_temp_deviation, respiratory_rate, spo2_avg
        FROM wearable_data
        WHERE user_id = ${userId}
          AND date >= ${sevenDaysAgo2}
          AND date <= ${today}
        ORDER BY date DESC
      `;
    } catch (wErr) {
      // Wearable table may not exist yet — gracefully degrade
      console.error('Wearable data fetch warning:', wErr.message);
    }

    // 8. Build the briefing
    var trackingEnabled = cycleProfile && cycleProfile.tracking_enabled;
    var briefing;

    if (trackingEnabled && cycleProfile.last_period_start) {
      briefing = await buildCycleBriefing(today, user, cycleProfile, todayCheckin, recentCheckins, streak, calendarEvents, wearableData);
    } else {
      briefing = buildGeneralBriefing(today, todayCheckin, recentCheckins, streak);
    }

    return res.status(200).json(briefing);
  } catch (err) {
    console.error('Briefing GET error:', err.message);
    // On AI failure, fall back to static briefing
    try {
      var fallback = buildStaticFallback(new Date().toISOString().split('T')[0]);
      return res.status(200).json(fallback);
    } catch (fallbackErr) {
      return sendError(res, 500, 'Server error');
    }
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

function getPhaseMapName(phase) {
  switch (phase) {
    case 'reflect': return 'menstrual';
    case 'build': return 'follicular';
    case 'perform': return 'ovulatory';
    case 'complete': return 'luteal';
    default: return 'follicular';
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


// ══════════════════════════════════════════════════════════════════════════
//  COMPREHENSIVE PHASE-SPECIFIC KNOWLEDGE BASE
//  Embedded directly in the AI system prompt for maximum context
// ══════════════════════════════════════════════════════════════════════════

var PHASE_KNOWLEDGE = {
  menstrual: {
    bioName: 'Menstrual Phase (Inner Winter)',
    modeName: 'Reflect Mode',
    typicalDays: '1-5',
    hormones: 'Estrogen and progesterone are both at their lowest. Your body is shedding the uterine lining. Prostaglandins trigger uterine contractions. FSH starts rising toward the end to begin building the next follicle.',
    nutrition: {
      eat: [
        'Iron-rich foods to replenish blood loss: red meat, liver, spinach, lentils, dark leafy greens, pumpkin seeds',
        'Magnesium-rich foods for cramp relief and mood: dark chocolate (70%+), almonds, cashews, avocado, bananas',
        'Omega-3 fatty acids to reduce inflammation: salmon, sardines, walnuts, flaxseeds, chia seeds',
        'Warm, cooked foods that are easy to digest: bone broth, soups, stews, roasted root vegetables',
        'Vitamin C to aid iron absorption: citrus fruits, bell peppers, strawberries alongside iron-rich foods',
        'Zinc for immune support and tissue repair: oysters, beef, chickpeas, pumpkin seeds',
        'Herbal teas: ginger tea (anti-inflammatory, nausea), chamomile (calming), raspberry leaf (uterine tone)'
      ],
      avoid: [
        'Excessive caffeine (constricts blood vessels, worsens cramps, depletes iron absorption)',
        'Alcohol (increases inflammation, worsens bloating, disrupts already-fragile hormone balance)',
        'Very cold or raw foods (Chinese medicine and many women report these worsen cramps)',
        'Excess dairy (casein can increase inflammation and bloating for some)',
        'Highly processed foods and refined sugar (spike inflammation, worsen mood swings)',
        'Excess salt (increases water retention and bloating)'
      ],
      fasting: 'Keep fasting windows SHORT: 12 hours maximum. Your body is already under physiological stress from menstruation. Extended fasting now raises cortisol when it is already elevated. Eat within an hour of waking. Prioritize nutrient-dense meals over calorie restriction.',
      mealTiming: 'Eat more frequently in smaller portions. Blood sugar can be unstable. Have a protein-rich breakfast within 1 hour of waking. Warm lunch as your biggest meal. Light, easy-to-digest dinner. Late-night dark chocolate is medicinal, not indulgent.',
      cravings: 'Chocolate cravings = your body needs magnesium. Eat dark chocolate (70%+), not milk chocolate. Craving red meat = your body needs iron. Craving carbs = blood sugar instability; pair carbs with protein and fat. Craving salty foods = possible mineral depletion; try mineral-rich bone broth.'
    },
    fitness: {
      type: 'Restorative and gentle movement only',
      intensity: 'LOW. This is non-negotiable. Your body is doing intense internal work.',
      workouts: [
        'Walking (20-30 minutes, preferably outdoors for vitamin D and mood)',
        'Gentle yoga (NOT power yoga or hot yoga; stick to restorative, yin, or slow flow)',
        'Stretching and foam rolling',
        'Light swimming (the water pressure can actually help with cramps)',
        'Slow dancing or gentle movement to music',
        'Breathwork and meditation (activates parasympathetic nervous system)'
      ],
      avoid: [
        'HIIT or high-intensity training (cortisol is already elevated)',
        'Heavy lifting (recovery capacity is at its lowest)',
        'Hot yoga (body temperature regulation is already challenged)',
        'Competitive sports (reaction time and coordination are lower)',
        'Any exercise that feels punishing. Movement should feel nurturing'
      ],
      recovery: 'Sleep 8-9 hours. Epsom salt baths (magnesium absorption through skin). Heating pad on lower abdomen. Gentle self-massage. This is the phase where rest IS productive.'
    },
    productivity: {
      prioritize: [
        'Strategic review and honest evaluation of projects, goals, relationships',
        'Journaling and reflective writing, because your inner critic is quiet and your insight is sharp',
        'Deep reading, research, learning that does not require output',
        'Financial reviews, budget analysis, auditing: detail work that benefits from a clear-eyed perspective',
        'Planning for the cycle ahead: what do you want to build, perform, and complete?'
      ],
      defer: [
        'Big presentations, pitches, or public speaking (save for Perform Mode)',
        'Networking events or meeting many new people',
        'Starting brand-new projects or initiatives',
        'High-stakes negotiations or difficult confrontations',
        'Any commitment that requires sustained high energy for 2+ hours'
      ],
      meetings: 'Small, intimate meetings only. One-on-ones are perfect. Avoid large group brainstorms. If you must attend a big meeting, be the listener/evaluator, not the presenter. Your BS detector is at maximum strength.',
      schedule: 'Front-load your most important work before 1pm when energy is highest. Build in 15-minute rest breaks between tasks. End work earlier if possible. Protect evenings for rest.'
    },
    emotional: {
      expect: 'Emotional clarity mixed with lower mood. You may feel introspective, quiet, or withdrawn, and this is normal and healthy. Some women feel a sense of relief as the premenstrual tension releases. Others feel grief or sadness without a clear cause.',
      tools: [
        'Journaling: write without filtering. Your menstrual insights are often your most honest',
        'Allow tears if they come. Crying releases stress hormones (literally)',
        'Reduce social media consumption, because you are more emotionally permeable right now',
        'Say no to anything that feels draining without guilt',
        'Warm baths, comfort movies, soft textures. Sensory soothing is not indulgence'
      ],
      social: 'Social battery is LOW. Cancel plans that feel heavy. Keep only the connections that feel nourishing. This is a quality-over-quantity phase. Your closest 1-2 people only.',
      selfCare: 'This is your sacred rest phase. The most productive thing you can do is genuinely rest. Every culture with cycle awareness builds rest into this phase. You are not lazy; you are cyclically intelligent.'
    },
    fertility: {
      status: 'Fertility is at its lowest. The uterine lining is shedding, making implantation virtually impossible. However, sperm can survive up to 5 days, so unprotected sex at the very end of a short menstrual phase could theoretically lead to conception if ovulation is early.',
      signs: 'Bleeding (obviously). Cervix is low and slightly open. Basal body temperature is at its lowest baseline.'
    },
    funFacts: [
      'During menstruation, the two brain hemispheres communicate more than at any other cycle point, which is why your creative problem-solving and integrative thinking are actually enhanced.',
      'Your pain threshold is lowest now, which is why everything feels more intense. Not in your head; it is in your neural pain processing centers.',
      'Research shows women make more accurate gut-feeling decisions during menstruation. Your BS filter is at maximum.',
      'Ancient cultures considered this a time of heightened intuition. Modern neuroscience agrees: reduced progesterone means less anxiety and more clarity about what you actually think.'
    ]
  },

  follicular: {
    bioName: 'Follicular Phase (Inner Spring)',
    modeName: 'Build Mode',
    typicalDays: '6-14',
    hormones: 'Estrogen is rising steadily and will continue climbing until ovulation. FSH is stimulating follicle growth in your ovaries. Testosterone begins its slow climb. Your brain is getting a serotonin and dopamine boost from rising estrogen. Verbal fluency, spatial reasoning, and learning capacity all increase.',
    nutrition: {
      eat: [
        'Light, fresh, energy-building foods: big colorful salads, fresh fruits, sprouted grains',
        'Fermented foods for gut health (estrogen metabolism happens in the gut): kimchi, sauerkraut, yogurt, kombucha, miso',
        'Lean proteins for muscle building: chicken, fish, eggs, tofu, legumes',
        'Phytoestrogen-supporting foods: flaxseeds (1-2 tbsp/day), sesame seeds, berries',
        'Complex carbs for sustained energy: quinoa, sweet potatoes, oats, brown rice',
        'Cruciferous vegetables for estrogen metabolism: broccoli, cauliflower, Brussels sprouts, kale',
        'Citrus fruits and vitamin C-rich foods for energy and immunity'
      ],
      avoid: [
        'Heavy, greasy comfort foods (your body does not need them now and they will slow you down)',
        'Excessive processed sugar (you have natural energy, so do not create a crash cycle)',
        'Skipping protein (your muscles are primed for building, so feed them)',
        'Overdoing caffeine (you have natural energy rising, so let it work)'
      ],
      fasting: 'This is your BEST phase for intermittent fasting if you practice it. Your body can handle 14-16 hour fasts comfortably. Cortisol is low, insulin sensitivity is high, and your body efficiently burns stored fuel. If you are going to do a longer fast, do it in this phase.',
      mealTiming: 'You may naturally feel less hungry in the morning, and this is normal with rising estrogen. Light breakfasts work well. Biggest meal can be lunch when your digestive fire is strongest. Lighter dinners support the natural energy and can improve sleep.',
      cravings: 'You probably will not crave much heavy food. If you are craving lighter, fresher foods, lean into it. Your body knows what it wants. If you still crave sugar, it may be a habit pattern rather than a biological need right now.'
    },
    fitness: {
      type: 'High intensity, new challenges, strength building',
      intensity: 'MODERATE to HIGH. Ramp up throughout the phase. By day 10-14 you can push hard.',
      workouts: [
        'HIIT and high-intensity interval training (your recovery is fastest now)',
        'Heavy strength training with progressive overload (estrogen supports muscle growth)',
        'Try new workout classes, sports, or movement styles (your brain craves novelty)',
        'Running, cycling, swimming at increasing intensity',
        'Dance cardio, kickboxing, high-energy group fitness',
        'Rock climbing, martial arts, anything that challenges coordination and learning'
      ],
      avoid: [
        'Playing it too safe. Your body can handle way more than you think',
        'Only doing gentle exercise when you have high-intensity capacity',
        'Skipping workouts, because your motivation and recovery are both peak'
      ],
      recovery: 'Recovery is FAST. You can train harder and more frequently. DOMS (delayed onset muscle soreness) resolves quicker. Still aim for 7-8 hours of sleep, but you may naturally need less.'
    },
    productivity: {
      prioritize: [
        'Brainstorming and ideation sessions, because your brain is forming novel neural connections faster',
        'Starting new projects, launching initiatives, pitching ideas',
        'Learning new skills, taking courses, reading challenging material',
        'Creative work: writing first drafts, designing, coding new features',
        'Strategic planning and mapping out multi-week projects',
        'Collaborative work, because your social brain is coming online strongly'
      ],
      defer: [
        'Repetitive admin tasks and detailed editing (save for Complete Mode)',
        'Tedious bookkeeping and data entry',
        'Routine maintenance work that wastes your creative energy'
      ],
      meetings: 'Brainstorms, strategy sessions, and collaborative meetings are perfect. Your verbal fluency is rising and you are naturally more persuasive. First meetings with new contacts work well. Schedule creative workshops and ideation sessions here.',
      schedule: 'Your energy builds throughout the day. Morning deep work on creative projects. Afternoon meetings and collaboration. You may have energy for evening projects too, so use it, but do not sacrifice sleep.'
    },
    emotional: {
      expect: 'Rising optimism, confidence, and social energy. You may feel adventurous, curious, and willing to take risks. A natural sense of possibility and "anything feels doable" energy. Your verbal fluency means you can articulate feelings well.',
      tools: [
        'Channel the rising energy into meaningful action. Do not just dream, start building',
        'Say yes to social invitations and new experiences',
        'Start conversations you have been putting off, because your communication skills are growing daily',
        'Set bold goals. This is when you feel most capable of achieving them',
        'Be aware: this optimism is real but time-limited. Start things now that you can sustain through the whole cycle'
      ],
      social: 'Social battery is HIGH and RISING. Networking, first dates, reconnecting with old friends: all excellent. You are naturally more curious and open to new perspectives. Your warmth and engagement are genuine and magnetic.',
      selfCare: 'Self-care in this phase means DOING things that excite you, not resting. Try the new restaurant. Join the class. Start the project. Feeding your curiosity IS self-care right now.'
    },
    fertility: {
      status: 'Fertility is building. Cervical mucus increases and becomes more slippery as you approach ovulation. The fertile window typically opens around day 10-11 of a 28-day cycle (about 5 days before ovulation). Sperm can survive up to 5 days in fertile cervical mucus.',
      signs: 'Increasing cervical mucus (becoming clearer and stretchier). Cervix rising higher and becoming softer. Possible slight cramping on one side (follicle growing). Rising libido. Increased body confidence.'
    },
    funFacts: [
      'Your hippocampus (memory center) actually increases in volume during the follicular phase. You literally have more brain for learning.',
      'Estrogen increases dopamine receptor sensitivity, so new experiences feel extra rewarding. Your brain is designed to seek novelty this week.',
      'Estrogen boosts serotonin and dopamine production, which is why you feel more optimistic. Not just mood; it is neurochemistry.',
      'Your brain forms new neural connections faster during this phase than any other. Your neuroplasticity sweet spot.'
    ]
  },

  ovulatory: {
    bioName: 'Ovulatory Phase (Inner Summer)',
    modeName: 'Perform Mode',
    typicalDays: '15-17',
    hormones: 'Estrogen peaks and triggers a surge of luteinizing hormone (LH), which causes the egg to release. Testosterone also peaks briefly. This dual peak creates your monthly superpower window: maximum confidence, verbal ability, physical performance, and social magnetism. FSH also surges. This window is SHORT, typically 2-3 days.',
    nutrition: {
      eat: [
        'Anti-inflammatory foods to support the ovulatory process: turmeric, ginger, berries, leafy greens',
        'Cruciferous vegetables for estrogen metabolism (estrogen is at its highest): broccoli, kale, Brussels sprouts, cauliflower, cabbage',
        'Light grains and raw vegetables, because your body temperature rises and lighter food feels better',
        'Glutathione-rich foods for liver support: asparagus, spinach, avocado',
        'Hydrating foods: cucumber, watermelon, celery, citrus. You need more water now',
        'Fiber-rich foods to help clear excess estrogen: chia seeds, flaxseeds, legumes, whole grains',
        'Green tea for gentle energy and antioxidants'
      ],
      avoid: [
        'Heavy red meat in large quantities (your body is already running hot)',
        'Excess sodium (increases water retention when bloating peaks)',
        'Alcohol binges (your liver is processing peak estrogen, so do not overload it)',
        'Dehydration (body temperature is higher, you lose more water)',
        'Very heavy meals (lighter meals keep you sharp for peak performance activities)'
      ],
      fasting: 'Moderate fasting windows are fine: 13-14 hours. Do not push to extremes because your body temperature and metabolic rate are elevated. Eat enough to fuel your peak performance. This is NOT the time to restrict. This is the time to FUEL.',
      mealTiming: 'Lighter meals more frequently. Your appetite may decrease naturally (this is hormonal, not a reason to skip eating). Hydrate aggressively, aiming for 3+ liters of water. Pre-fuel any peak-performance events (presentations, workouts, dates) with light, energizing meals.',
      cravings: 'Appetite often decreases around ovulation, and this is normal. If you crave lighter, fresher foods, honor it. If you crave nothing, still eat. Your body needs fuel for its peak performance window.'
    },
    fitness: {
      type: 'Peak performance, competition, personal records',
      intensity: 'MAXIMUM. This is your 2-3 day window for peak athletic output.',
      workouts: [
        'Heavy lifting: attempt personal records. Your strength literally peaks now',
        'Sprint intervals, high-intensity interval training at maximum effort',
        'Competitive sports and group fitness (your competitive drive peaks)',
        'Challenging hikes or adventure activities',
        'Dance cardio at full intensity',
        'Any physical challenge you have been building toward: race day, test day, competition'
      ],
      avoid: [
        'Excessive stretching (ligaments are MORE LAX due to relaxin and estrogen, meaning higher injury risk)',
        'Skipping warm-ups (especially important because ligament laxity increases joint vulnerability)',
        'Ignoring hydration (body temperature is elevated)',
        'Playing it safe when your body is built for peak output'
      ],
      recovery: 'Your body handles stress well but watch your joints. Warm up thoroughly. Ligaments are laxer due to hormonal changes, so ACL injuries are statistically more common around ovulation. Strengthen, but protect joints with proper form.'
    },
    productivity: {
      prioritize: [
        'Presentations, pitches, public speaking: your verbal skills PEAK now',
        'Sales calls, closing deals, negotiations, because confidence + eloquence = persuasion',
        'Difficult conversations you have been putting off. You have the courage AND the words',
        'Recording video or audio content, because your voice is literally more attractive',
        'Job interviews, performance reviews, asking for raises',
        'Leadership moments: team meetings, workshops, mentoring sessions',
        'Any situation where charisma and communication matter'
      ],
      defer: [
        'Detailed solo work that wastes your social peak',
        'Hiding behind email when you could be in person or on video',
        'Admin tasks, data entry, or routine work'
      ],
      meetings: 'Schedule your MOST IMPORTANT meetings here. Client pitches, board presentations, team rallies, difficult feedback conversations. Your persuasion, empathy, and quick thinking are all at their peak. You read people better and respond more eloquently.',
      schedule: 'Pack your schedule. This is your highest-energy, highest-output window. Early morning to evening, you have capacity. Front-load your most important and visible tasks. Evenings are great for social events and relationship conversations.'
    },
    emotional: {
      expect: 'Peak confidence, social magnetism, and assertiveness. You feel bold, clear, and capable. Your empathy is high, and you can read people intuitively. You may feel more sensual and physically aware. Communication flows easily.',
      tools: [
        'Use this confidence window to do things that scare you: make the ask, have the talk, take the stage',
        'Be aware: this is a SHORT window. Do not waste it. Schedule the hard stuff HERE.',
        'Your empathy is high, which makes this great for mentoring, coaching, and vulnerable conversations',
        'Channel the social magnetism into meaningful connections, not just surface-level fun',
        'If single: this is your most attractive window (literally, research confirms voice, appearance, and scent shift). Go on dates.'
      ],
      social: 'You are MAGNETIC. People are drawn to your energy. Host events, lead meetings, go on dates, have important relationship conversations. Research shows women are perceived as more attractive during ovulation: voice pitch changes, skin glows, body language opens up. This is not vanity; it is biology.',
      selfCare: 'Self-care during ovulation means SHOWING UP FULLY. Do not hide. Do not play small. Use your voice. Take up space. This is the phase where you let yourself shine without apology.'
    },
    fertility: {
      status: 'PEAK FERTILITY. The egg is released and survives 12-24 hours. Combined with sperm survival (up to 5 days), the fertile window is roughly 6 days. This is the biological reason your body is optimized for attraction and connection right now.',
      signs: 'Egg-white cervical mucus (clear, stretchy, slippery). Peak libido. Subtle one-sided cramping (Mittelschmerz, or ovulation pain). Slight rise in basal body temperature after ovulation. Breast sensitivity may begin. Cervix is high, soft, and open.'
    },
    funFacts: [
      'Research shows voices, faces, and even body scent become measurably more attractive during ovulation. Your body is literally optimized for connection.',
      'Testosterone peaks alongside estrogen, boosting both confidence and assertiveness. It is not cockiness; it is biochemistry.',
      'Your pain tolerance is highest now, reaction time is fastest, and spatial awareness peaks. Built for physical challenge.',
      'Women score higher on verbal fluency tests during ovulation and show increased activity in brain areas for reward and social cognition. Neurologically wired to connect and communicate.'
    ]
  },

  luteal: {
    bioName: 'Luteal Phase (Inner Autumn)',
    modeName: 'Complete Mode',
    typicalDays: '18-28',
    hormones: 'Progesterone rises sharply as the corpus luteum forms after ovulation. Estrogen has a secondary, smaller rise. In the EARLY luteal (days 18-23), progesterone provides calm focus and detail-orientation. In the LATE luteal (days 24-28), both progesterone and estrogen DROP steeply, which triggers PMS symptoms, mood shifts, and the inner critic getting LOUD. Serotonin production also drops.',
    nutrition: {
      eat: [
        'Complex carbs to boost serotonin (your brain makes less now): sweet potatoes, oatmeal, brown rice, quinoa, whole grain bread',
        'Magnesium-rich foods (cramping prevention + mood support): dark chocolate, pumpkin seeds, almonds, spinach, black beans',
        'Healthy fats for hormone production: avocado, olive oil, coconut oil, nuts, fatty fish',
        'Root vegetables (grounding, warming, nutrient-dense): beets, carrots, parsnips, sweet potatoes, squash',
        'B6-rich foods for PMS relief: chickpeas, salmon, chicken, bananas, potatoes',
        'Calcium-rich foods (reduce PMS symptoms by up to 50% in studies): yogurt, leafy greens, almonds, fortified foods',
        'Fiber to help clear excess estrogen: ground flaxseed, chia seeds, vegetables, legumes',
        'Warming spices: cinnamon (blood sugar), turmeric (inflammation), ginger (nausea/bloating)'
      ],
      avoid: [
        'Restrictive dieting or calorie cutting (your metabolic rate is 5-10% HIGHER, and you need MORE food)',
        'Excessive caffeine (amplifies anxiety and disrupts already-fragile sleep)',
        'Alcohol (worsens mood instability, disrupts sleep, increases inflammation, depresses already-declining serotonin)',
        'Excessive sugar (creates blood sugar crashes that worsen mood swings)',
        'Very low-carb or keto diets (your brain NEEDS carbs to make serotonin right now)',
        'Excess salt in late luteal (increases water retention and bloating)'
      ],
      fasting: 'REDUCE fasting windows to 12-13 hours MAX. Your cortisol is elevated from progesterone and gets worse as the phase progresses. Extended fasting in the luteal phase RAISES cortisol further, worsens anxiety, disrupts sleep, and can trigger binge eating. Eat breakfast. Do not skip meals.',
      mealTiming: 'Eat more frequently. Your metabolic rate is 100-300 calories higher per day, so honor that. Protein-rich breakfast within 1 hour of waking (stabilizes blood sugar and cortisol). Eat every 3-4 hours. Complex carb snack before bed can help with sleep (triggers serotonin > melatonin pathway).',
      cravings: 'Chocolate craving = your body needs magnesium. Dark chocolate (70%+), not candy bars. Craving carbs = your brain needs serotonin; eat complex carbs with protein. Craving salty food = possible mineral imbalance; try mineral-rich foods. THESE CRAVINGS ARE VALID. Do not fight them. Redirect them to healthier versions of what your body is actually asking for. You burn 100-300 more calories/day in this phase. EAT.'
    },
    fitness: {
      type: 'Moderate and decreasing intensity as the phase progresses',
      intensity: 'MODERATE in early luteal (days 18-23), LOW in late luteal (days 24-28). Listen to your body; it will tell you.',
      workouts: [
        'Early luteal: moderate strength training, Pilates, steady-state cardio, swimming, hiking',
        'Late luteal: walking, gentle yoga, stretching, Pilates mat work, light swimming',
        'Throughout: barre classes, moderate cycling, yoga flow (not power yoga)',
        'Walking is UNDERRATED in this phase. 20-30 minutes reduces PMS symptoms significantly',
        'Swimming is excellent (water pressure reduces bloating, low-impact, meditative)'
      ],
      avoid: [
        'Intense HIIT (cortisol is already elevated, so do not add more stress hormones)',
        'Hot yoga (body temperature regulation is challenged by progesterone)',
        'Pushing for PRs or competition (recovery is slower, injury risk is higher)',
        'Punishing yourself for lower performance (this is BIOLOGY, not weakness)',
        'Exercising in a fasted state (blood sugar is less stable)'
      ],
      recovery: 'Recovery takes longer. DOMS lasts longer. Sleep 8-9 hours. Epsom salt baths. Gentle stretching. Do not feel guilty about rest days. Your body is doing important work building the uterine lining and preparing for the next cycle.'
    },
    productivity: {
      prioritize: [
        'Finishing and closing out existing projects, because your brain WANTS completion',
        'Editing, proofreading, quality assurance: your detail orientation peaks with progesterone',
        'Administrative tasks: invoicing, filing, inbox zero, expense reports',
        'Process documentation and SOPs, because your organizational brain is activated',
        'Evaluating and grading work rather than creating new work',
        'Decluttering: physical space, digital files, to-do lists'
      ],
      defer: [
        'Starting brand-new projects (your brain will resist novelty)',
        'Making permanent, irreversible decisions (ESPECIALLY in late luteal)',
        'Impulsive business moves, quitting things, starting fights',
        'High-visibility presentations (schedule those for Perform Mode)',
        'Taking on new commitments or saying yes to things that require sustained energy'
      ],
      meetings: 'Detail-review meetings, project wrap-ups, and one-on-ones are good. Avoid brainstorms (you will feel frustrated by half-baked ideas). Your critical eye is sharpened, so use it for QA and feedback, not for tearing things apart destructively. In late luteal, reduce meeting load significantly.',
      schedule: 'Front-load work in the morning. Energy drops faster in the afternoon. Build in more breaks. End work earlier. In late luteal (days 25-28), consider this a wind-down period and do not schedule anything high-stakes.'
    },
    emotional: {
      expect: 'EARLY LUTEAL (days 18-23): Calm focus, nesting energy, desire for order and completion. Introverted but stable. LATE LUTEAL (days 24-28): This is where PMS lives. Progesterone and estrogen both DROP rapidly. Serotonin drops. Your inner critic gets LOUD. Things that did not bother you last week suddenly feel unbearable. Irritability, anxiety, sadness, or rage can appear. THIS IS TEMPORARY AND BIOCHEMICAL.',
      tools: [
        'EARLY LUTEAL: Channel the organizational energy. Clean, sort, finish, file. It feels deeply satisfying.',
        'LATE LUTEAL: Your emotions are REAL but AMPLIFIED. They reveal genuine issues but with the volume turned up to 11.',
        'Write down what is bothering you. Look at the list again on day 8 of your next cycle. You will be surprised how different it feels.',
        'Do NOT send that email. Do NOT quit your job. Do NOT start that fight. Do NOT make permanent decisions.',
        'Eat dark chocolate (magnesium). Walk for 20 minutes. Take a warm bath. Call someone who makes you feel safe.',
        'Revisit any big decisions on day 8 of your next cycle. Your perspective will be radically different.',
        'Your tolerance for BS drops. That is not PMS; it is clarity. The difference is: write it down now, act on it next week.'
      ],
      social: 'Social battery is DECLINING. Early luteal: intimate gatherings and quality one-on-one time. Late luteal: your inner circle only. Cancel anything that feels draining without guilt. Your tolerance for surface-level socializing and people-pleasing evaporates, so honor that boundary.',
      selfCare: 'This is high-priority self-care time. Warm baths. Early bedtime. Comfort food (the healthy kind). Gentle movement. Reduced obligations. Extra magnesium. In late luteal, treat yourself like you are recovering from something, because neurochemically, you kind of are.'
    },
    lateLutealToolkit: {
      validation: 'This is TEMPORARY. Your progesterone is crashing. The world is not actually falling apart. Your brain is processing emotions with less serotonin buffer, so everything feels more raw. You are not crazy, dramatic, or too much. You are experiencing a real neurochemical shift that will pass within days.',
      doNotList: [
        'Do NOT send that angry/emotional email. Save it as a draft. Read it on day 8.',
        'Do NOT quit your job, end a relationship, or make any permanent decision.',
        'Do NOT start a fight about something that can wait 5 days.',
        'Do NOT compare yourself to how you felt during Perform Mode. That is like comparing winter to summer.',
        'Do NOT restrict food to "fix" how you feel. Eat more, not less.',
        'Do NOT cancel your own needs to people-please. Boundaries are even more essential now.'
      ],
      emergencyActions: [
        'Eat dark chocolate (magnesium calms the nervous system)',
        'Walk outside for 20 minutes (movement + nature + light = serotonin boost)',
        'Take a warm bath or shower (activates parasympathetic nervous system)',
        'Call your safest person, the one who does not require you to perform',
        'Put your phone on do-not-disturb and lie down for 15 minutes',
        'Write stream-of-consciousness in a journal to get it OUT of your head and onto paper',
        'Revisit whatever is bothering you on day 8. It will look completely different. This is not dismissing your feelings; it is giving them the right context.'
      ],
      reframe: 'Your inner critic is loudest right now. Write down what is bothering you. Then look at it again next week. You will be surprised how different it feels. The issues may still be real, but the URGENCY and the CATASTROPHIZING are progesterone withdrawal talking. Your late-luteal self sees problems accurately but evaluates solutions poorly. Note the problems. Solve them in Build or Perform mode.'
    },
    fertility: {
      status: 'Fertility drops after ovulation. The egg survives only 12-24 hours. After day 17-18 of a typical cycle, the fertile window is closed until the next cycle. Progesterone makes cervical mucus thick and inhospitable to sperm.',
      signs: 'Thick, creamy, or dry cervical mucus. Basal body temperature rises 0.3-0.5 degrees and stays elevated. Cervix drops lower and becomes firm. Breast tenderness from progesterone. Bloating and water retention increase toward the end of the phase.'
    },
    funFacts: [
      'You burn 100-300 MORE calories per day in the luteal phase. Those cravings are your metabolism asking for fuel it genuinely needs.',
      'Progesterone is literally a calming neurosteroid that acts on GABA receptors, the same receptors targeted by anti-anxiety medications. Your body makes its own chill pill.',
      'The heightened sensitivity before your period is linked to a temporary serotonin drop. You are not too sensitive; your brain is processing emotions with less chemical buffer.',
      'The nesting instinct is not just for pregnant women. Progesterone makes everyone want to organize, clean, and create order. Your brain is tidying up before the cycle resets.'
    ]
  }
};


// ══════════════════════════════════════════════════════════════════════════
//  DOT GREETINGS AND SIGN-OFFS (exact copy per spec)
// ══════════════════════════════════════════════════════════════════════════

var DOT_GREETINGS = {
  reflect: function (name) { return name + ', gentle morning. Your body did a lot this month. Let\'s keep it low today.'; },
  build:   function (name) { return name + ', today\'s going to be one of those days. The good kind.'; },
  perform: function (name) { return name + ', you\'re in your main character era. Literally. Biologically. Let\'s go.'; },
  complete: function (name) { return name + ', your uterus sent a memo.'; }
};

var DOT_SIGNOFFS = {
  reflect: 'The to-do list can wait. Today is about the basics: warmth, nourishment, rest. Your body just completed a full cycle. Be gentle. I\'ll have a fresh plan when you\'re ready.',
  build: 'Go be ambitious today. Your energy is climbing and your brain is wired for novelty. Start the thing. Say yes to the thing. I\'ll be here tomorrow with your next plan.',
  perform: 'You are genuinely, biologically peaking right now. Crush it. I\'ll tell you when to ease off. Not today.',
  complete: 'You don\'t need to be a productivity machine today. Eat the carbs, do the gentle yoga, crush that Q2 review. The sourdough believes in you.'
};


// ══════════════════════════════════════════════════════════════════════════
//  AI SYSTEM PROMPT BUILDER
// ══════════════════════════════════════════════════════════════════════════

function buildSystemPrompt(phase, cycleDay, cycleLength, cycleDateConfidence, hasCheckinData, todayEvents, weekEvents, wearableData) {
  var phaseBioName = getPhaseMapName(phase);
  var knowledge = PHASE_KNOWLEDGE[phaseBioName];

  var phaseRange = getPhaseDayRange(phase, cycleLength);
  var dayWithinPhase = cycleDay - phaseRange.start + 1;
  var totalPhaseDays = phaseRange.end - phaseRange.start + 1;
  var isLateLuteal = (phaseBioName === 'luteal' && dayWithinPhase > Math.round(totalPhaseDays * 0.6));

  var confidenceLanguage;
  if (cycleDateConfidence === 'exact') {
    confidenceLanguage = 'The user tracks their period precisely. Use DEFINITIVE language: "You are on day X," "Your estrogen IS rising," "This IS your power window." Speak with certainty.';
  } else {
    confidenceLanguage = 'The user\'s cycle date is ESTIMATED (they may not track precisely). Use APPROXIMATE language: "You\'re likely around day X," "Your estrogen is probably rising," "This is likely your..." Add phrases like "based on your estimated cycle" occasionally. Never promise exact timing.';
  }

  var parts = [];

  // ── Dot's identity and voice ──
  parts.push('You are Dot, PeakHer\'s Hormonal Intelligence AI.');
  parts.push('You generate a personalized daily briefing that covers hormones, calendar, nutrition, movement, fasting, productivity, and emotional weather.');
  parts.push('PeakHer is NOT a period tracker. It is a decision engine. Every recommendation leads with what to DO, then explains the science.');
  parts.push('');
  parts.push('DOT\'S PERSONALITY: Direct, informed, cheeky, warm, systematic. The slightly unhinged friend who built an algorithm around your cycle and sends you a brief every morning so you don\'t have to think.');
  parts.push('You are NOT a medical professional, chatbot, or generic assistant. You are Dot.');
  parts.push('');
  parts.push('DOT\'S CORE RULES:');
  parts.push('1. Always lead with the ACTION, then explain the science. Never lead with data.');
  parts.push('2. Be specific: name times, foods, amounts, durations. Never "eat well and exercise."');
  parts.push('3. Validate feelings as biological, then redirect with a specific action.');
  parts.push('4. Use "I" and "your". Never "we" or "users".');
  parts.push('5. Never dump data without a decision.');
  parts.push('');
  parts.push('PHASE-ADJUSTED TONE (one voice, four tones):');
  parts.push('- Restore: gentle, validating, protective. Speak softly. "Rest is the strategy today."');
  parts.push('- Rise: energized, encouraging, creative. Build momentum. "Start messy. Start now."');
  parts.push('- Peak: hyped, confident, bold. Full gas. "You\'re magnetic today. Use it."');
  parts.push('- Sustain: warm, grounded, practical, no-BS. "Finish what you started. Skip the heroics."');
  parts.push('');
  parts.push('TONE GUIDE:');
  parts.push('- Funny but not trying too hard. Irreverent but not mean.');
  parts.push('- Science-backed but delivered like you\'re talking over coffee, not in a lab coat.');
  parts.push('- Short punchy sentences mixed with explanations.');
  parts.push('- Swear lightly if it fits (damn, hell yes) but keep it classy.');
  parts.push('- Anti-corporate. No "empowering women" cliches. No stock wellness language.');
  parts.push('- Reference hormones specifically (progesterone, estrogen, cortisol) but explain what they DO.');
  parts.push('- Never use em dashes. Use commas, colons, semicolons, periods, or connecting words.');
  parts.push('');
  parts.push('PHASE NAME RULE: Use Restore/Rise/Peak/Sustain in consumer copy. Clinical terms (luteal, follicular) as secondary context only.');
  parts.push('  Example: "You\'re in Sustain, what science calls the luteal phase."');
  parts.push('');
  parts.push('CYCLE DATE CONFIDENCE:');
  parts.push(confidenceLanguage);
  parts.push('');

  // ── Phase-specific knowledge dump ──
  parts.push('=== PHASE KNOWLEDGE: ' + knowledge.bioName + ' (' + knowledge.modeName + ') ===');
  parts.push('Typical cycle days: ' + knowledge.typicalDays);
  parts.push('Hormonal context: ' + knowledge.hormones);
  parts.push('');

  parts.push('NUTRITION GUIDANCE:');
  parts.push('Foods to eat and why: ' + knowledge.nutrition.eat.join(' | '));
  parts.push('Foods to avoid and why: ' + knowledge.nutrition.avoid.join(' | '));
  parts.push('Fasting guidance: ' + knowledge.nutrition.fasting);
  parts.push('Meal timing: ' + knowledge.nutrition.mealTiming);
  parts.push('Craving decoder: ' + knowledge.nutrition.cravings);
  parts.push('');

  parts.push('FITNESS GUIDANCE:');
  parts.push('Workout type: ' + knowledge.fitness.type);
  parts.push('Intensity: ' + knowledge.fitness.intensity);
  parts.push('Recommended workouts: ' + knowledge.fitness.workouts.join(' | '));
  parts.push('Workouts to avoid: ' + knowledge.fitness.avoid.join(' | '));
  parts.push('Recovery: ' + knowledge.fitness.recovery);
  parts.push('');

  parts.push('PRODUCTIVITY GUIDANCE:');
  parts.push('Prioritize: ' + knowledge.productivity.prioritize.join(' | '));
  parts.push('Defer: ' + knowledge.productivity.defer.join(' | '));
  parts.push('Meeting types: ' + knowledge.productivity.meetings);
  parts.push('Schedule strategy: ' + knowledge.productivity.schedule);
  parts.push('');

  parts.push('EMOTIONAL & RELATIONAL:');
  parts.push('What to expect: ' + knowledge.emotional.expect);
  parts.push('Emotional tools: ' + knowledge.emotional.tools.join(' | '));
  parts.push('Social energy: ' + knowledge.emotional.social);
  parts.push('Self-care priority: ' + knowledge.emotional.selfCare);
  parts.push('');

  parts.push('FERTILITY AWARENESS:');
  parts.push(knowledge.fertility.status);
  parts.push('Signs: ' + knowledge.fertility.signs);
  parts.push('');

  parts.push('FUN FACTS (use ONE per briefing): ' + knowledge.funFacts.join(' | '));
  parts.push('');

  // ── Late luteal special toolkit ──
  if (isLateLuteal) {
    var toolkit = PHASE_KNOWLEDGE.luteal.lateLutealToolkit;
    parts.push('======================================');
    parts.push('!!! LATE LUTEAL EMOTIONAL TOOLKIT - CRITICAL !!!');
    parts.push('The user is in LATE LUTEAL (the hardest emotional days of the cycle).');
    parts.push('This briefing MUST include proactive emotional support.');
    parts.push('');
    parts.push('VALIDATION MESSAGE (include this): ' + toolkit.validation);
    parts.push('');
    parts.push('DO NOT LIST (include 2-3 of these): ' + toolkit.doNotList.join(' | '));
    parts.push('');
    parts.push('EMERGENCY ACTIONS (include 2-3 of these): ' + toolkit.emergencyActions.join(' | '));
    parts.push('');
    parts.push('REFRAME (include this concept): ' + toolkit.reframe);
    parts.push('======================================');
    parts.push('');
  }

  // ── Calendar context with energy tagging instructions ──
  var hasCalendarData = (todayEvents && todayEvents.length > 0) || (weekEvents && weekEvents.length > 0);
  if (hasCalendarData) {
    parts.push('=== CALENDAR INTELLIGENCE ===');
    parts.push('The user has connected their calendar. Use their actual schedule to make guidance concrete and actionable.');
    parts.push('');

    if (todayEvents && todayEvents.length > 0) {
      parts.push('TODAY\'S SCHEDULE:');
      for (var ei = 0; ei < todayEvents.length; ei++) {
        var te = todayEvents[ei];
        var timeStr = te.is_all_day ? 'All day' : formatEventTime(te.start_time);
        var impStr = te.estimated_importance ? ' (importance: ' + te.estimated_importance + '/10)' : '';
        var attendeeStr = te.attendee_count > 1 ? ' [' + te.attendee_count + ' attendees]' : '';
        parts.push('- ' + timeStr + ': ' + te.title + impStr + attendeeStr);
      }
      parts.push('');
    }

    var highStakesWeek = weekEvents ? weekEvents.filter(function (e) { return e.estimated_importance >= 7; }) : [];
    if (highStakesWeek.length > 0) {
      parts.push('HIGH-STAKES EVENTS THIS WEEK:');
      for (var wi = 0; wi < highStakesWeek.length; wi++) {
        var we = highStakesWeek[wi];
        var wDate = new Date(we.start_time);
        var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        var wDayName = dayNames[wDate.getDay()];
        var wTimeStr = we.is_all_day ? 'All day' : formatEventTime(we.start_time);
        parts.push('- ' + wDayName + ' ' + wTimeStr + ': ' + we.title + ' (importance: ' + we.estimated_importance + '/10)');
      }
      parts.push('');
    }

    parts.push('CALENDAR INTELLIGENCE RULES:');
    parts.push('- For EACH meeting today, tag it with an energy level: "high", "steady", or "low". Base this on the time of day combined with the current phase:');
    parts.push('  - Restore: morning = steady, afternoon = low, evening = low');
    parts.push('  - Rise: morning = high, afternoon = high, evening = steady');
    parts.push('  - Peak: morning = high, afternoon = high, evening = high');
    parts.push('  - Sustain: morning = steady, afternoon = low, evening = low');
    parts.push('- For EACH meeting, provide Dot\'s phase-specific advice (what to eat before, how to prepare energy-wise, what to watch out for).');
    parts.push('- Reference SPECIFIC events by name and time in your guidance sections.');
    parts.push('- In Focus: mention upcoming meetings/events and how the current phase affects preparation.');
    parts.push('- In Movement: suggest timing movement around the schedule.');
    parts.push('- In Emotional Weather: flag high-stakes events and how the phase interacts.');
    parts.push('- In Nutrition: time meals and snacks around events.');
    parts.push('- Do NOT just list the schedule back. WEAVE events into phase-specific guidance naturally.');
    parts.push('');
  }

  // ── Wearable data context ──
  var hasWearableData = wearableData && wearableData.length > 0;
  if (hasWearableData) {
    parts.push('=== WEARABLE DATA ===');
    parts.push('The user has a connected wearable device. Use this biometric data to make guidance SPECIFIC and personalized.');
    parts.push('');

    var todayStr = new Date().toISOString().split('T')[0];
    var todayWearable = wearableData.find(function (w) { return String(w.date).split('T')[0] === todayStr; });
    var recentDays = wearableData.slice(0, 7);

    if (todayWearable) {
      parts.push('TODAY\'S BIOMETRICS (' + (todayWearable.provider || 'wearable') + '):');
      if (todayWearable.sleep_duration_min) parts.push('- Sleep: ' + Math.round(todayWearable.sleep_duration_min / 60 * 10) / 10 + ' hours' + (todayWearable.sleep_quality_score ? ' (quality: ' + Math.round(todayWearable.sleep_quality_score) + '/100)' : '') + (todayWearable.deep_sleep_min ? ', deep: ' + todayWearable.deep_sleep_min + 'min, REM: ' + (todayWearable.rem_sleep_min || '?') + 'min' : ''));
      if (todayWearable.hrv_avg) parts.push('- HRV: ' + Math.round(todayWearable.hrv_avg) + 'ms' + (todayWearable.hrv_max ? ' (max: ' + Math.round(todayWearable.hrv_max) + 'ms)' : ''));
      if (todayWearable.resting_hr) parts.push('- Resting HR: ' + Math.round(todayWearable.resting_hr) + ' bpm');
      if (todayWearable.recovery_score != null) parts.push('- Recovery: ' + Math.round(todayWearable.recovery_score) + '%');
      if (todayWearable.readiness_score != null) parts.push('- Readiness: ' + Math.round(todayWearable.readiness_score) + '/100');
      if (todayWearable.strain_score != null) parts.push('- Strain: ' + (Math.round(todayWearable.strain_score * 10) / 10));
      if (todayWearable.stress_avg != null) parts.push('- Stress: ' + Math.round(todayWearable.stress_avg) + '/100');
      if (todayWearable.body_battery_start != null) parts.push('- Body Battery: ' + todayWearable.body_battery_start + ' \u2192 ' + (todayWearable.body_battery_end || '?'));
      if (todayWearable.skin_temp_deviation != null) parts.push('- Skin temp deviation: ' + (todayWearable.skin_temp_deviation > 0 ? '+' : '') + todayWearable.skin_temp_deviation + '\u00B0C');
      if (todayWearable.respiratory_rate) parts.push('- Respiratory rate: ' + todayWearable.respiratory_rate + ' breaths/min');
      parts.push('');
    }

    if (recentDays.length >= 3) {
      var avgSleep = 0, avgHrv = 0, avgRecovery = 0, sleepCount = 0, hrvCount = 0, recCount = 0;
      for (var wdi = 0; wdi < recentDays.length; wdi++) {
        if (recentDays[wdi].sleep_duration_min) { avgSleep += recentDays[wdi].sleep_duration_min; sleepCount++; }
        if (recentDays[wdi].hrv_avg) { avgHrv += recentDays[wdi].hrv_avg; hrvCount++; }
        if (recentDays[wdi].recovery_score != null) { avgRecovery += recentDays[wdi].recovery_score; recCount++; }
      }
      parts.push('7-DAY AVERAGES:');
      if (sleepCount) parts.push('- Sleep: ' + Math.round(avgSleep / sleepCount / 60 * 10) / 10 + ' hours/night');
      if (hrvCount) parts.push('- HRV: ' + Math.round(avgHrv / hrvCount) + 'ms');
      if (recCount) parts.push('- Recovery: ' + Math.round(avgRecovery / recCount) + '%');
      parts.push('');
    }

    parts.push('WEARABLE DATA RULES:');
    parts.push('- Use SPECIFIC numbers: "Your HRV of 38ms is below your 7-day average of 45ms, which suggests..." not "your recovery seems low."');
    parts.push('- In Movement: adjust workout intensity based on recovery/HRV/strain.');
    parts.push('- In Nutrition: reference sleep quality.');
    parts.push('- In Emotional Weather: connect biometrics to mood.');
    parts.push('- In Focus: use readiness/body battery to guide scheduling.');
    parts.push('- Compare today to their 7-day trend when relevant.');
    parts.push('- Skin temp deviation is cycle-relevant: rises after ovulation (progesterone effect).');
    parts.push('');
  }

  // ── Check-in data instructions ──
  if (!hasCheckinData) {
    parts.push('NOTE: The user has NO check-in history yet. This is their first or early briefing.');
    parts.push('Generate a FULL, RICH briefing using ONLY phase knowledge. Do NOT say "we need more data."');
    parts.push('Do NOT mention that they have not checked in. Just give them an amazing, specific briefing.');
    parts.push('The value should be immediate and obvious from day one.');
    parts.push('');
  } else {
    parts.push('The user has check-in history. Use it to personalize the briefing by referencing trends, patterns, and today\'s data if available.');
    parts.push('');
  }

  // ── Structured JSON output format ──
  parts.push('=== OUTPUT FORMAT ===');
  parts.push('You MUST respond with valid JSON only. No markdown, no backticks, no explanation outside the JSON.');
  parts.push('');
  parts.push('{');
  parts.push('  "greeting": "Phase-specific Dot greeting for the user by name. Use these EXACT templates:');
  parts.push('    Restore: [Name], gentle morning. Your body did a lot this month. Let\'s keep it low today.');
  parts.push('    Rise: [Name], today\'s going to be one of those days. The good kind.');
  parts.push('    Peak: [Name], you\'re in your main character era. Literally. Biologically. Let\'s go.');
  parts.push('    Sustain: [Name], your uterus sent a memo.');
  parts.push('    Replace [Name] with the user\'s actual name.",');
  parts.push('');
  parts.push('  "hormone_download": "2-4 sentences about what is happening hormonally RIGHT NOW in Dot\'s voice. Be specific about which hormones, what they are doing, and how that translates to how she feels. This is not a textbook; it is Dot explaining biology like a friend.",');
  parts.push('');
  if (hasCalendarData) {
    parts.push('  "calendar_intelligence": [');
    parts.push('    {');
    parts.push('      "time": "The meeting time (e.g. 9:00 AM)",');
    parts.push('      "title": "The meeting title",');
    parts.push('      "energy_tag": "high | steady | low (based on time of day + current phase)",');
    parts.push('      "dot_says": "1-2 sentences of Dot\'s phase-specific advice for this meeting. Be concrete: what to eat before, how to manage energy, what to watch out for."');
    parts.push('    }');
    parts.push('  ],');
    parts.push('');
  }
  parts.push('  "movement": {');
  parts.push('    "do_this": { "name": "Specific workout name", "duration": "e.g. 30 minutes", "why": "1 sentence linking to hormones/phase" },');
  parts.push('    "skip_this": { "name": "Specific workout to avoid", "why": "1 sentence linking to hormones/phase" }');
  parts.push('  },');
  parts.push('');
  parts.push('  "nutrition": {');
  parts.push('    "eat": [');
  parts.push('      { "food": "Specific food name", "emoji": "single relevant food emoji", "why": "1 sentence linking to hormones/phase" }');
  parts.push('    ],');
  parts.push('    "ease_up": [');
  parts.push('      { "food": "Specific food to reduce", "emoji": "single relevant emoji", "why": "1 sentence linking to hormones/phase" }');
  parts.push('    ]');
  parts.push('  },');
  parts.push('');
  parts.push('  "fasting": {');
  parts.push('    "protocol": "e.g. 12:12, 14:10, 16:8, or No fasting today",');
  parts.push('    "fasting_window": "e.g. 8 PM to 8 AM",');
  parts.push('    "eating_window": "e.g. 8 AM to 8 PM",');
  parts.push('    "why": "1-2 sentences explaining why this protocol fits today\'s hormonal state"');
  parts.push('  },');
  parts.push('');
  parts.push('  "focus": "2-3 sentences about what type of work to prioritize today, specific task types, and one scheduling tip. Link to hormones.",');
  parts.push('');
  parts.push('  "emotional_weather": "2-4 sentences about what to expect emotionally and how to handle it. Validate the feeling as biological, then give a specific action. If late luteal, this should be longer (4-6 sentences) and include the toolkit elements.",');
  parts.push('');
  parts.push('  "key_insight": "One science-backed insight in Dot\'s voice. The single most important thing to remember today. Make it screenshot-worthy.",');
  parts.push('');
  parts.push('  "sign_off": "Phase-specific Dot sign-off. Use these EXACT sign-offs:');
  parts.push('    Restore: The to-do list can wait. Today is about the basics: warmth, nourishment, rest. Your body just completed a full cycle. Be gentle. I\'ll have a fresh plan when you\'re ready.');
  parts.push('    Rise: Go be ambitious today. Your energy is climbing and your brain is wired for novelty. Start the thing. Say yes to the thing. I\'ll be here tomorrow with your next plan.');
  parts.push('    Peak: You are genuinely, biologically peaking right now. Crush it. I\'ll tell you when to ease off. Not today.');
  parts.push('    Sustain: You don\'t need to be a productivity machine today. Eat the carbs, do the gentle yoga, crush that Q2 review. The sourdough believes in you.",');
  parts.push('');
  parts.push('  "phase_overview": "2-3 sentences summarizing the current phase, what hormones are doing, and the overall energy forecast. Keep for backward compatibility.",');
  parts.push('');
  parts.push('  "phaseOverview": {');
  parts.push('    "headline": "An engaging, memorable headline for the day (10-20 words)",');
  parts.push('    "summary": "2-3 sentences about where she is in her cycle, what hormones are doing, and the overall energy forecast. Same content as phase_overview."');
  parts.push('  },');
  parts.push('  "nutritionSection": {');
  parts.push('    "headline": "Short nutrition headline (5-10 words)",');
  parts.push('    "body": "3-5 sentences covering what to eat, fasting, and craving decoding. Be SPECIFIC."');
  parts.push('  },');
  parts.push('  "movementSection": {');
  parts.push('    "headline": "Short movement headline (5-10 words)",');
  parts.push('    "body": "3-5 sentences covering workout type, intensity, and what to avoid."');
  parts.push('  },');
  parts.push('  "focusSection": {');
  parts.push('    "headline": "Short productivity headline (5-10 words)",');
  parts.push('    "body": "3-5 sentences covering tasks to prioritize, what to defer, scheduling."');
  parts.push('  },');
  parts.push('  "emotionalWeather": {');
  parts.push('    "headline": "Short emotional headline (5-10 words)",');
  parts.push('    "body": "3-5 sentences covering emotional forecast, coping tools, social energy."');
  parts.push('  },');
  parts.push('  "keyInsight": "Same content as key_insight. One powerful sentence.",');
  parts.push('  "dotSignoff": "Same content as sign_off."');

  if (hasCalendarData) {
    parts.push('  ,"scheduleInsight": "One sentence connecting the most important calendar event today with the current cycle phase."');
  }

  parts.push('}');
  parts.push('');
  parts.push('IMPORTANT RULES:');
  parts.push('- Cover ALL sections. Do not skip any.');
  parts.push('- Provide 3-5 items in the nutrition.eat array and 1-3 in nutrition.ease_up.');
  if (hasCalendarData) {
    parts.push('- Provide a calendar_intelligence entry for EVERY meeting today.');
  }
  parts.push('- Be SPECIFIC. Name foods, workouts, task types. No generic "eat well and exercise."');
  parts.push('- Every recommendation should link back to WHAT IS HAPPENING HORMONALLY.');
  parts.push('- Vary the content. If this is day 3 vs day 5 of the same phase, the guidance should shift.');
  parts.push('- Make the key_insight / keyInsight something she would actually screenshot and save.');
  parts.push('- Never use the word "journey." Never say "listen to your body" without specifying WHAT to listen for.');
  parts.push('- Never use em dashes. Use commas, colons, semicolons, periods, or connecting words like "and," "so," "because," or "to" instead.');
  parts.push('- The greeting and sign_off MUST use the exact templates provided. Do not improvise them.');

  return parts.join('\n');
}


function buildUserMessage(user, cycleDay, cycleLength, phase, todayCheckin, recentCheckins, streak, todayEvents, weekEvents) {
  var parts = [];

  parts.push('Generate today\'s daily briefing.');
  parts.push('');
  parts.push('User: ' + (user.name || 'Friend'));
  if (user.personas && user.personas.length > 0) {
    parts.push('Her roles/hats: ' + user.personas.join(', '));
  }
  parts.push('Cycle day: ' + cycleDay + ' of ' + cycleLength);
  parts.push('Phase: ' + getModeName(phase) + ' (' + getPhaseMapName(phase) + ')');

  var phaseRange = getPhaseDayRange(phase, cycleLength);
  var dayWithinPhase = cycleDay - phaseRange.start + 1;
  var totalPhaseDays = phaseRange.end - phaseRange.start + 1;
  parts.push('Day ' + dayWithinPhase + ' of ' + totalPhaseDays + ' in this phase');
  parts.push('');

  // Today's check-in data
  if (todayCheckin) {
    parts.push('TODAY\'S CHECK-IN:');
    parts.push('- Energy: ' + todayCheckin.energy + '/10');
    parts.push('- Confidence: ' + todayCheckin.confidence + '/10');
    if (todayCheckin.sleep_quality != null) parts.push('- Sleep quality: ' + todayCheckin.sleep_quality + '/10');
    if (todayCheckin.stress_level != null) parts.push('- Stress level: ' + todayCheckin.stress_level + '/10');
    if (todayCheckin.notes) parts.push('- Notes: ' + todayCheckin.notes);
    parts.push('');
  }

  // Recent trends
  if (recentCheckins && recentCheckins.length > 0) {
    parts.push('RECENT CHECK-INS (last ' + recentCheckins.length + ' days):');
    var energies = recentCheckins.map(function (c) { return Number(c.energy); });
    var confidences = recentCheckins.map(function (c) { return Number(c.confidence); });
    parts.push('- Avg energy: ' + round1(avg(energies)) + '/10');
    parts.push('- Avg confidence: ' + round1(avg(confidences)) + '/10');

    if (energies.length >= 2) {
      var trend = energies[0] - energies[energies.length - 1];
      if (trend > 1) parts.push('- Energy trend: RISING (+' + round1(trend) + ' over the period)');
      else if (trend < -1) parts.push('- Energy trend: FALLING (' + round1(trend) + ' over the period)');
      else parts.push('- Energy trend: stable');
    }
    parts.push('');
  }

  // Streak context
  var currentStreak = streak.current_streak || 0;
  if (currentStreak > 0) {
    parts.push('Check-in streak: ' + currentStreak + ' days');
    parts.push('');
  }

  // Calendar events context (detailed for calendar intelligence)
  if (todayEvents && todayEvents.length > 0) {
    parts.push('TODAY\'S CALENDAR (' + todayEvents.length + ' events):');
    for (var tei = 0; tei < todayEvents.length; tei++) {
      var tev = todayEvents[tei];
      var tTimeStr = tev.is_all_day ? 'All day' : formatEventTime(tev.start_time);
      var tImp = tev.estimated_importance ? ', importance: ' + tev.estimated_importance + '/10' : '';
      var tAttendees = tev.attendee_count > 1 ? ', ' + tev.attendee_count + ' attendees' : '';
      parts.push('- ' + tTimeStr + ': ' + tev.title + ' (' + (tev.event_type || 'meeting') + tImp + tAttendees + ')');
    }
    parts.push('');
  }

  if (weekEvents && weekEvents.length > 0) {
    var highStakes = weekEvents.filter(function (e) { return e.estimated_importance >= 7; });
    if (highStakes.length > 0) {
      parts.push('HIGH-STAKES EVENTS THIS WEEK (' + highStakes.length + '):');
      for (var wsi = 0; wsi < highStakes.length; wsi++) {
        var wsev = highStakes[wsi];
        var wsDate = new Date(wsev.start_time);
        var wsDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        parts.push('- ' + wsDayNames[wsDate.getDay()] + ' ' + formatEventTime(wsev.start_time) + ': ' + wsev.title + ' (importance: ' + wsev.estimated_importance + '/10)');
      }
      parts.push('');
    }
  }

  // Day of week for scheduling context
  var dayOfWeek = parseDate(new Date().toISOString().split('T')[0]);
  if (dayOfWeek) {
    var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    parts.push('Today is ' + dayNames[dayOfWeek.getDay()] + '.');
  }

  return parts.join('\n');
}


// ── Briefing builders ───────────────────────────────────────────────────

async function buildCycleBriefing(today, user, cycleProfile, todayCheckin, recentCheckins, streak, calendarEvents, wearableData) {
  var lastPeriodStart = cycleProfile.last_period_start instanceof Date
    ? cycleProfile.last_period_start.toISOString().split('T')[0]
    : String(cycleProfile.last_period_start);
  var cycleLength = cycleProfile.average_cycle_length || 28;
  var cycleDay = calculateCycleDay(lastPeriodStart, cycleLength, today);
  var phase = getPhaseForCycleDay(cycleDay, cycleLength);
  var phaseRange = getPhaseDayRange(phase, cycleLength);

  var cycleDateConfidence = cycleProfile.cycle_date_confidence || 'estimated';
  var hasCheckinData = recentCheckins && recentCheckins.length > 0;

  // Separate today's events from upcoming week events
  var todayEvents = [];
  var weekEvents = [];
  if (calendarEvents && calendarEvents.length > 0) {
    for (var ci = 0; ci < calendarEvents.length; ci++) {
      var evt = calendarEvents[ci];
      var evtDate = new Date(evt.start_time).toISOString().split('T')[0];
      if (evtDate === today) {
        todayEvents.push(evt);
      } else {
        weekEvents.push(evt);
      }
    }
  }

  // Build the AI-generated briefing sections
  var systemPrompt = buildSystemPrompt(phase, cycleDay, cycleLength, cycleDateConfidence, hasCheckinData, todayEvents, weekEvents, wearableData);
  var userMessage = buildUserMessage(user, cycleDay, cycleLength, phase, todayCheckin, recentCheckins, streak, todayEvents, weekEvents);

  var aiBriefing = null;
  try {
    var aiResult = await sendMessage({
      system: systemPrompt,
      userMessage: userMessage,
      maxTokens: 3000,
      temperature: 0.7
    });

    if (aiResult && !aiResult.skipped && aiResult.content) {
      // Parse JSON from AI response, handling potential markdown wrapping
      var jsonStr = aiResult.content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      aiBriefing = JSON.parse(jsonStr);
    }
  } catch (aiErr) {
    console.error('Briefing AI generation error:', aiErr.message);
    // Fall through to static fallback
  }

  // Build the static fallback content
  var staticContent = STATIC_PHASE_CONTENT[phase] || STATIC_PHASE_CONTENT.build;
  var dayWithinPhase = cycleDay - phaseRange.start;
  var headlineIndex = dayWithinPhase % staticContent.headlines.length;
  var summaryIndex = dayWithinPhase % staticContent.summaries.length;
  var funFactIndex = dayWithinPhase % staticContent.funFacts.length;

  // Personalization from check-in data
  var personalization = buildPersonalization(todayCheckin, recentCheckins);
  var currentStreak = streak.current_streak || 0;
  var streakMessage = getStreakMessage(currentStreak);

  // Determine Dot greeting and sign-off (use AI if available, fall back to templates)
  var userName = user.name || 'Friend';
  var dotGreeting = (aiBriefing && aiBriefing.greeting) ? aiBriefing.greeting : DOT_GREETINGS[phase](userName);
  var dotSignoff = (aiBriefing && aiBriefing.sign_off) ? aiBriefing.sign_off : DOT_SIGNOFFS[phase];

  // Build backward-compatible briefing response
  var briefing = {
    date: today,
    cycleDay: cycleDay,
    totalCycleDays: cycleLength,
    phase: phase,
    phaseName: staticContent.phaseName,
    phaseEmoji: staticContent.phaseEmoji,
    phaseDayRange: phaseRange,
    cycleDateConfidence: cycleDateConfidence,

    // v3 Dot-powered structured sections
    greeting: dotGreeting,
    hormone_download: aiBriefing ? aiBriefing.hormone_download : null,
    calendar_intelligence: aiBriefing ? (aiBriefing.calendar_intelligence || null) : null,
    movement: aiBriefing ? aiBriefing.movement : null,
    nutrition: aiBriefing ? aiBriefing.nutrition : null,
    fasting: aiBriefing ? aiBriefing.fasting : null,
    focus: aiBriefing ? aiBriefing.focus : null,
    emotional_weather: aiBriefing ? aiBriefing.emotional_weather : null,
    key_insight: aiBriefing ? aiBriefing.key_insight : null,
    sign_off: dotSignoff,
    phase_overview: aiBriefing ? aiBriefing.phase_overview : null,

    // v2 AI-enriched sections (backward compat for frontend)
    aiBriefing: aiBriefing,

    // v1 static fallback (used if AI fails or frontend is old)
    headline: aiBriefing && aiBriefing.phaseOverview ? aiBriefing.phaseOverview.headline : staticContent.headlines[headlineIndex],
    summary: aiBriefing && aiBriefing.phaseOverview ? aiBriefing.phaseOverview.summary : staticContent.summaries[summaryIndex],
    recommendations: staticContent.recommendations,
    todayEnergy: staticContent.todayEnergy,
    energyForecast: staticContent.energyForecast,
    funFact: staticContent.funFacts[funFactIndex],
    streakInfo: {
      current: currentStreak,
      message: streakMessage
    },
    hasCheckedInToday: !!todayCheckin,
    checkinPrompt: todayCheckin
      ? null
      : 'Hey, quick pulse check? Two sliders, 10 seconds. The more you share, the smarter I get. \u2014 Dot',
    trackingEnabled: true,

    // v2 backward compat: dotSignoff
    dotSignoff: dotSignoff,

    // AI-generated briefing text (backward compat: combined text)
    briefing: aiBriefing ? buildLegacyBriefingText(aiBriefing, dotGreeting, dotSignoff) : null,
    aiGenerated: !!aiBriefing
  };

  // Add schedule insight from AI if available
  if (aiBriefing && aiBriefing.scheduleInsight) {
    briefing.scheduleInsight = aiBriefing.scheduleInsight;
  }

  if (personalization) {
    briefing.personalization = personalization;
  }

  return briefing;
}


/**
 * Build a legacy plain-text briefing from the structured AI response
 * so the old frontend can still render it as a single block of text.
 */
function buildLegacyBriefingText(ai, greeting, signoff) {
  var sections = [];

  if (greeting) sections.push(greeting);
  if (ai.hormone_download) sections.push('\n' + ai.hormone_download);

  if (ai.phaseOverview && ai.phaseOverview.summary) {
    sections.push('\n' + ai.phaseOverview.summary);
  }

  if (ai.focusSection) {
    sections.push('\n' + ai.focusSection.headline + '\n' + ai.focusSection.body);
  } else if (ai.focus) {
    sections.push('\nFocus\n' + ai.focus);
  }

  if (ai.nutritionSection) {
    sections.push('\n' + ai.nutritionSection.headline + '\n' + ai.nutritionSection.body);
  }

  if (ai.movementSection) {
    sections.push('\n' + ai.movementSection.headline + '\n' + ai.movementSection.body);
  }

  if (ai.emotionalWeather) {
    var ew = ai.emotionalWeather;
    if (typeof ew === 'object' && ew.headline) {
      sections.push('\n' + ew.headline + '\n' + ew.body);
    } else if (typeof ew === 'string') {
      sections.push('\nEmotional Weather\n' + ew);
    }
  }

  if (ai.key_insight || ai.keyInsight) {
    sections.push('\n' + (ai.key_insight || ai.keyInsight));
  }

  if (signoff) sections.push('\n' + signoff);

  return sections.join('\n');
}


function buildGeneralBriefing(today, todayCheckin, recentCheckins, streak) {
  var dayOfWeek = parseDate(today).getDay();
  var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var dayName = dayNames[dayOfWeek];
  var dayContent = getDayOfWeekContent(dayOfWeek);
  var personalization = buildPersonalization(todayCheckin, recentCheckins);
  var currentStreak = streak.current_streak || 0;
  var streakMessage = getStreakMessage(currentStreak);

  var headline = dayContent.headline;
  var summary = dayContent.summary;

  if (recentCheckins.length >= 3) {
    var energies = recentCheckins.map(function (c) { return Number(c.energy); });
    var avgEnergy = energies.reduce(function (a, b) { return a + b; }, 0) / energies.length;
    var recentTrend = energies.length >= 2 ? energies[0] - energies[energies.length - 1] : 0;

    if (recentTrend > 1.5) {
      headline = 'Your energy has been climbing. Ride the wave.';
      summary = 'Over the last ' + recentCheckins.length + ' check-ins, your energy is trending up. Whatever you\'re doing, keep doing it. Today is a good day to tackle something ambitious.';
    } else if (recentTrend < -1.5) {
      headline = 'Energy\'s been dipping. Time to recharge.';
      summary = 'Your recent check-ins show a downward energy trend. That\'s not failure, it\'s data. Today, prioritize rest, light movement, and things that fill your cup.';
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
      work: { title: 'Work & Career', tip: dayContent.tip, doThis: dayContent.doThis, skipThis: dayContent.skipThis },
      fitness: { title: 'Movement', tip: dayContent.fitnessTip, doThis: dayContent.fitnessDoThis, skipThis: dayContent.fitnessSkipThis },
      nutrition: { title: 'Fuel', tip: dayContent.nutritionTip, doThis: dayContent.nutritionDoThis, skipThis: dayContent.nutritionSkipThis },
      social: { title: 'Relationships', tip: dayContent.socialTip, doThis: dayContent.socialDoThis, skipThis: dayContent.socialSkipThis }
    },
    todayEnergy: dayContent.energy,
    energyForecast: dayContent.forecast,
    funFact: dayContent.funFact,
    streakInfo: { current: currentStreak, message: streakMessage },
    hasCheckedInToday: !!todayCheckin,
    checkinPrompt: todayCheckin ? null : 'Quick check-in? Two sliders, 10 seconds. Your data gets smarter every day.',
    trackingEnabled: false,
    cycleTrackingCTA: 'Want guidance tailored to your cycle? Enable cycle tracking in your profile for a daily briefing that knows exactly where you are in your month.'
  };

  if (personalization) {
    briefing.personalization = personalization;
  }

  return briefing;
}


function buildStaticFallback(today) {
  return {
    date: today,
    cycleDay: null,
    totalCycleDays: null,
    phase: null,
    phaseName: 'Today',
    phaseEmoji: '\u2728',
    headline: 'Your daily briefing is loading...',
    summary: 'We hit a snag generating your personalized briefing. Check back in a few minutes, or do a quick check-in to keep your streak alive.',
    recommendations: {},
    hasCheckedInToday: false,
    checkinPrompt: 'Quick check-in? Two sliders, 10 seconds.',
    trackingEnabled: false
  };
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

  if (todayCheckin) {
    var e = Number(todayCheckin.energy);
    var conf = Number(todayCheckin.confidence);
    if (e >= 8 && conf >= 8) {
      result.todayNote = 'You\'re feeling strong today. Capitalize on it; this is a power day.';
    } else if (e <= 3 || conf <= 3) {
      result.todayNote = 'Tough day. That\'s real and valid. Be gentle with yourself and do less, not more.';
    } else if (e >= 7) {
      result.todayNote = 'Energy is solid today. You\'ve got fuel in the tank, so use it on something meaningful.';
    } else if (conf >= 7) {
      result.todayNote = 'Confidence is high even if energy isn\'t peak. Trust your gut on decisions today.';
    }
  }

  return result;
}


// ══════════════════════════════════════════════════════════════════════════
//  STATIC PHASE CONTENT (v1 fallback, used when AI is unavailable)
// ══════════════════════════════════════════════════════════════════════════

var STATIC_PHASE_CONTENT = {
  reflect: {
    phase: 'reflect',
    phaseName: 'Restore',
    phaseEmoji: '\uD83C\uDF19',
    headlines: [
      'Rest is not laziness. It\'s strategy.',
      'Your uterus is doing the heavy lifting today. Give her some space.',
      'You\'re not broken. You\'re recalibrating.',
      'The world can wait. You\'re processing.',
      'Permission to slow down. Granted.'
    ],
    summaries: [
      'Energy is at its lowest point in your cycle, and that\'s by design. Your body is literally shedding and rebuilding. This is not the time to launch things; it\'s the time to see things clearly.',
      'Progesterone and estrogen are both at rock bottom right now. Your body is doing hard physical work even if you\'re sitting still. Honor that.',
      'Think of this as your monthly system reboot. Everything slows down so your brain can process at a deeper level.'
    ],
    recommendations: {
      work: { title: 'Work & Career', tip: 'Review, analyze, and think strategically. Your analytical brain is sharper right now.', doThis: 'Audit your projects. Journal about what\'s working and what isn\'t.', skipThis: 'Launching new initiatives, networking events, or anything that requires you to be "on."' },
      fitness: { title: 'Movement', tip: 'Walk. Stretch. Gentle yoga. Don\'t pile more stress on your already-elevated cortisol.', doThis: 'A 20-minute walk outside, restorative yoga, foam rolling', skipThis: 'HIIT, heavy lifting, or anything that leaves you wrecked.' },
      nutrition: { title: 'Fuel', tip: 'You\'re losing iron. Eat like you mean it. Red meat, spinach, lentils, dark leafy greens.', doThis: 'Iron-rich foods, warm meals, dark chocolate, bone broth', skipThis: 'Restrictive dieting or skipping meals.' },
      social: { title: 'Relationships', tip: 'Low-key hangouts only. Cancel anything draining.', doThis: 'Couch hangs with closest people, phone calls instead of dinners out', skipThis: 'Big parties, networking events, emotionally heavy conversations' }
    },
    todayEnergy: 'low',
    energyForecast: 'rebuilding',
    funFacts: [
      'During menstruation, the right hemisphere of your brain becomes more active, and your intuition and creative insights are sharper.',
      'Your pain threshold is lowest right now, which is why everything feels more intense.',
      'Research shows women make more accurate gut-feeling decisions during menstruation.'
    ]
  },
  build: {
    phase: 'build',
    phaseName: 'Rise',
    phaseEmoji: '\uD83D\uDD25',
    headlines: [
      'Your brain is in creative overdrive today.',
      'Today\'s vibe: say yes to everything.',
      'Estrogen is rising and so are you.',
      'Your starter pistol just fired. Go build something.',
      'Spring has sprung inside your body.'
    ],
    summaries: [
      'Energy is climbing. Estrogen is rising. Your brain is primed for new ideas, new projects, new everything.',
      'Welcome to your creative peak. Rising estrogen is boosting your verbal fluency, spatial reasoning, and ability to learn new things.',
      'Your body is building toward ovulation and your brain is along for the ride. Neurotransmitters are firing.'
    ],
    recommendations: {
      work: { title: 'Work & Career', tip: 'Brainstorm. Pitch ideas. Start that project. Novel neural connections are forming faster.', doThis: 'Schedule the meeting where you propose something new. Write the first draft. Start the thing.', skipThis: 'Mindless admin tasks. Save those for Complete mode.' },
      fitness: { title: 'Movement', tip: 'Go hard. Your body can handle high-intensity. Recovery is faster.', doThis: 'HIIT, running, dance cardio, trying new classes', skipThis: 'Only gentle exercise. Your body can handle more now' },
      nutrition: { title: 'Fuel', tip: 'Light proteins and fermented foods. Your gut is thriving and metabolism efficient.', doThis: 'Fresh salads, fermented foods, lean proteins, colorful plates', skipThis: 'Heavy comfort foods. You don\'t need them right now' },
      social: { title: 'Relationships', tip: 'Social battery is fully charged. Say yes to plans.', doThis: 'Coffee dates, networking, team brainstorms, social outings', skipThis: 'Hermit mode. You\'d be wasting your social superpowers' }
    },
    todayEnergy: 'rising',
    energyForecast: 'high',
    funFacts: [
      'Your brain forms new neural connections faster during this phase. Your neuroplasticity sweet spot.',
      'Estrogen increases dopamine receptor sensitivity, so new experiences feel extra rewarding.',
      'Rising estrogen boosts verbal fluency and creative problem-solving. Brain chemistry, not motivation.'
    ]
  },
  perform: {
    phase: 'perform',
    phaseName: 'Peak',
    phaseEmoji: '\uD83D\uDC51',
    headlines: [
      'You\'re magnetic today. Use it.',
      'Main character energy: activated.',
      'This is your moment. Don\'t play small.',
      'Peak everything. Go be undeniable.',
      'You\'re literally glowing. Science says so.'
    ],
    summaries: [
      'Estrogen just peaked and testosterone is surging alongside it. You are at your most confident, articulate, and physically capable. This window is short, only 2 to 3 days.',
      'Your verbal skills, social confidence, and physical performance are all at their monthly peak.',
      'Biology just handed you a cheat code. Testosterone and estrogen are both peaking.'
    ],
    recommendations: {
      work: { title: 'Work & Career', tip: 'Close deals. Give presentations. Your communication skills peak now.', doThis: 'The salary negotiation. The client pitch. The difficult feedback conversation.', skipThis: 'Hiding behind your laptop doing solo work.' },
      fitness: { title: 'Movement', tip: 'Go all out. Heavy lifting, competitive sports, personal bests.', doThis: 'Lift heavy, sprint, compete, set a PR', skipThis: 'Taking it easy. Your body is designed for peak output.' },
      nutrition: { title: 'Fuel', tip: 'Anti-inflammatory foods and raw veggies. Metabolism is at its fastest.', doThis: 'Big colorful salads, raw vegetables, anti-inflammatory foods, lighter meals', skipThis: 'Skipping meals. Your brain needs fuel' },
      social: { title: 'Relationships', tip: 'You\'re the life of the party. People are literally more attracted to you now.', doThis: 'Date night, networking, the conversation you\'ve been avoiding', skipThis: 'Canceling plans. Your social magnetism is peaking.' }
    },
    todayEnergy: 'peak',
    energyForecast: 'maximum',
    funFacts: [
      'Testosterone peaks alongside estrogen during ovulation, boosting confidence and assertiveness.',
      'Research shows women are perceived as more attractive during ovulation: voice, skin, body language all shift.',
      'Your pain tolerance is highest, reaction time fastest, spatial awareness peaks.'
    ]
  },
  complete: {
    phase: 'complete',
    phaseName: 'Sustain',
    phaseEmoji: '\uD83C\uDFAF',
    headlines: [
      'Finish what you started. Don\'t start anything new.',
      'You\'re not losing motivation. Your hormones are shifting gears.',
      'Detail mode: activated. Use it before it uses you.',
      'Your inner project manager just clocked in.',
      'Finish line energy. Let\'s close some loops.'
    ],
    summaries: [
      'Progesterone is running the show now, and it wants closure. Your brain is shifting from "create new things" to "finish existing things."',
      'Energy is starting to taper. Progesterone makes you more detail-oriented, focused on completion, and less tolerant of chaos.',
      'Your brain chemistry flipped from novelty-seeking to completion-seeking. Those half-finished projects? Your brain wants to tackle them now.'
    ],
    recommendations: {
      work: { title: 'Work & Career', tip: 'Detail work, admin, follow-ups, finishing. Your brain wants closure.', doThis: 'Close out projects, send follow-ups, organize files, do the tedious-but-necessary tasks', skipThis: 'Starting brand new initiatives. Your brain will resist novelty.' },
      fitness: { title: 'Movement', tip: 'Moderate is the move. Pilates, swimming, steady-state cardio.', doThis: 'Pilates, swimming, hiking, moderate strength training, walks', skipThis: 'Intense HIIT or pushing for PRs. Recovery takes longer.' },
      nutrition: { title: 'Fuel', tip: 'Complex carbs, magnesium-rich foods. You burn 100-300 more calories/day now.', doThis: 'Dark chocolate, sweet potatoes, nuts, whole grains. Eat when hungry.', skipThis: 'Beating yourself up about cravings or restricting.' },
      social: { title: 'Relationships', tip: 'Smaller groups, deeper conversations. Quality over quantity.', doThis: 'One-on-one dinners, deep conversations, setting boundaries', skipThis: 'Big group events or anything requiring sustained "on" energy.' }
    },
    todayEnergy: 'tapering',
    energyForecast: 'moderate-to-low',
    funFacts: [
      'Progesterone enhances detail-orientation and follow-through. That urge to organize everything? It\'s hormonal and productive.',
      'Your metabolic rate increases 5-10% during the luteal phase. Those cravings are your metabolism asking for fuel.',
      'The nesting instinct isn\'t just for pregnancy. Progesterone makes everyone want to organize and create order.'
    ]
  }
};


// ── Day-of-week content (for non-cycle-tracking users) ──────────────────

function getDayOfWeekContent(dayOfWeek) {
  var content = {
    0: {
      headline: 'Sunday is for strategy, not scrambling.',
      summary: 'The most productive people use Sunday to think, not to grind. Review your week, set intentions, and protect your energy for Monday.',
      emoji: '\uD83C\uDF1F', energy: 'restorative', forecast: 'building-for-monday',
      tip: 'Review last week. Plan this week.', doThis: 'Weekly review, intention setting, meal prep, calendar audit', skipThis: 'Catching up on work emails.',
      fitnessTip: 'Movement that feels good, not punishing.', fitnessDoThis: 'Nature walk, gentle yoga, swimming', fitnessSkipThis: 'Brutal workout that leaves you drained for Monday',
      nutritionTip: 'Meal prep is a power move.', nutritionDoThis: 'Prep meals, try a new recipe, hydrate', nutritionSkipThis: 'Restrictive eating or skipping meals',
      socialTip: 'Low-key quality time.', socialDoThis: 'Brunch with close friends, family time', socialSkipThis: 'Doom scrolling instead of connection',
      funFact: 'Spending 30 minutes on Sunday planning reduces weekday stress by up to 30%.'
    },
    1: {
      headline: 'Monday sets the tone. Make it count.',
      summary: 'Your willpower is highest at the start of the week. Use it on the hardest thing first.',
      emoji: '\u26A1', energy: 'fresh', forecast: 'high-potential',
      tip: 'Tackle your most important task before 11am.', doThis: 'The one task you\'ve been avoiding. The big work.', skipThis: 'Starting with email.',
      fitnessTip: 'Set the tone with a strong workout.', fitnessDoThis: 'Strength training, running, high-intensity class', fitnessSkipThis: 'Skipping because you\'re "too busy"',
      nutritionTip: 'Protein-heavy breakfast.', nutritionDoThis: 'Eggs, protein smoothie, overnight oats with nuts', nutritionSkipThis: 'Coffee as a meal',
      socialTip: 'Set boundaries early.', socialDoThis: 'Clear communication about priorities', socialSkipThis: 'Saying yes to every meeting request',
      funFact: 'Cognitive function and self-regulation are highest on Monday mornings.'
    },
    2: {
      headline: 'Tuesday is secretly the most productive day of the week.',
      summary: 'Monday\'s warm-up is done. You\'re in the zone. Statistically the day people accomplish the most.',
      emoji: '\uD83D\uDD25', energy: 'peak-week', forecast: 'high',
      tip: 'Deep work time. Block 2-3 hours for your most important project.', doThis: 'Deep work, creative projects, strategy', skipThis: 'Back-to-back meetings.',
      fitnessTip: 'Body and mind are warmed up. Great for trying new things.', fitnessDoThis: 'New class, new route, strength training', fitnessSkipThis: 'Sitting all day',
      nutritionTip: 'Brain fuel for deep work.', nutritionDoThis: 'Salmon, avocado, nuts, berries', nutritionSkipThis: 'Sugar crashes from that 2pm candy bar',
      socialTip: 'Collaborative energy is high.', socialDoThis: 'Team brainstorms, mentoring conversations', socialSkipThis: 'Working in isolation',
      funFact: 'A 10,000-person study found Tuesday is the most productive day of the work week.'
    },
    3: {
      headline: 'Midweek check: are you doing the right things?',
      summary: 'Wednesday is your midweek compass. Reassess priorities before the week tips.',
      emoji: '\uD83E\uDDED', energy: 'steady', forecast: 'moderate-high',
      tip: 'Midweek review. Are your Monday priorities still right?', doThis: 'Priority check, follow-ups, course corrections', skipThis: 'Autopilot mode.',
      fitnessTip: 'Mid-intensity. Keep momentum.', fitnessDoThis: 'Moderate strength, a solid run, pilates', fitnessSkipThis: 'Skipping to "save energy"',
      nutritionTip: 'Hydration check. Most people are dehydrated by midweek.', nutritionDoThis: 'Extra water, electrolytes, balanced meals', nutritionSkipThis: 'Relying on caffeine only',
      socialTip: 'Check in on people who matter.', socialDoThis: 'That text you\'ve been putting off, lunch with a colleague', socialSkipThis: 'Isolating because you\'re "too busy"',
      funFact: 'A brief midweek reflection activates your prefrontal cortex and improves decisions for the rest of the week.'
    },
    4: {
      headline: 'Thursday: close the loops before they haunt your weekend.',
      summary: 'The weekend is visible. Wrap up everything that could become Sunday-night anxiety.',
      emoji: '\uD83C\uDFAF', energy: 'focused', forecast: 'moderate',
      tip: 'Completion mode. What can you finish today?', doThis: 'Close out projects, send follow-ups, make decisions', skipThis: 'Starting big new projects.',
      fitnessTip: 'Steady effort. Keep showing up.', fitnessDoThis: 'Regular routine, consistency', fitnessSkipThis: 'Going so hard you can\'t move Friday',
      nutritionTip: 'Nourish, don\'t just fuel.', nutritionDoThis: 'Nutrient-dense meals, vegetables, protein', nutritionSkipThis: 'Takeout because you\'re tired',
      socialTip: 'Make weekend plans. Anticipation boosts happiness.', socialDoThis: 'Confirm plans, reach out to a friend', socialSkipThis: 'Leaving the weekend unplanned',
      funFact: 'Having plans for the weekend increases Thursday happiness by up to 20%.'
    },
    5: {
      headline: 'Wrap it up. Your weekend doesn\'t earn itself.',
      summary: 'Finish strong. Friday is for tying up loose ends and protecting your weekend.',
      emoji: '\uD83C\uDF89', energy: 'winding-down', forecast: 'moderate-to-low',
      tip: 'Weekly review and loose ends.', doThis: 'Inbox zero, weekly review, prep Monday priorities', skipThis: 'Starting something ambitious.',
      fitnessTip: 'Fun movement. Friday workouts should feel like play.', fitnessDoThis: 'Dance class, a fun run, pickup sports', fitnessSkipThis: 'Guilt-driven exercise',
      nutritionTip: 'Enjoy yourself.', nutritionDoThis: 'That restaurant you\'ve been wanting, indulgent cooking', nutritionSkipThis: 'Skipping dinner',
      socialTip: 'Transition to human mode.', socialDoThis: 'Happy hour, dinner with friends', socialSkipThis: 'Working late "just this once"',
      funFact: 'Your brain consolidates learning during rest. The weekend is when your brain integrates this week.'
    },
    6: {
      headline: 'Recharge or play. The only wrong answer is working.',
      summary: 'Your brain needs actual rest to perform well next week.',
      emoji: '\u2600\uFE0F', energy: 'restorative', forecast: 'recharging',
      tip: 'No work. Do something that makes you feel alive.', doThis: 'Hobbies, time outdoors, creative fun', skipThis: 'Checking Slack or email.',
      fitnessTip: 'Adventure movement. Make it an experience.', fitnessDoThis: 'Hiking, outdoor activities, exploring', fitnessSkipThis: 'Your regular gym routine',
      nutritionTip: 'Intuitive eating. Listen to your body.', nutritionDoThis: 'Farmers market, cook something new', nutritionSkipThis: 'Tracking macros on Saturday',
      socialTip: 'Full presence. Phone away.', socialDoThis: 'Quality time without screens, adventures together', socialSkipThis: 'Saying no to everything',
      funFact: 'The #1 predictor of sustained excellence is recovery quality, not work ethic.'
    }
  };
  return content[dayOfWeek] || content[1];
}


// ── Streak messages ─────────────────────────────────────────────────────

function getStreakMessage(currentStreak) {
  if (currentStreak === 0) return 'Start a new streak today. One check-in is all it takes.';
  if (currentStreak === 1) return 'Day 1. Every streak starts here. Come back tomorrow to make it 2.';
  if (currentStreak === 2) return '2 days in a row. You\'re building a habit.';
  if (currentStreak <= 5) return currentStreak + ' days strong. Your future self is going to thank you.';
  if (currentStreak <= 10) return currentStreak + ' days. You\'re in the habit zone. This data is starting to tell a story.';
  if (currentStreak <= 20) return currentStreak + ' days. Most people never get here. Your pattern data is getting seriously useful.';
  if (currentStreak <= 30) return currentStreak + ' days. A full month of showing up for yourself.';
  if (currentStreak <= 60) return currentStreak + ' days. Top 1% of self-awareness. Your data predicts your best days.';
  return currentStreak + ' days. You\'re basically a scientist studying yourself. Respect.';
}


// ── Mini briefing for email/push (exported for cron) ────────────────────

function getMiniPhraseBriefing(lastPeriodStart, cycleLength, dateStr) {
  var cycleDay = calculateCycleDay(lastPeriodStart, cycleLength, dateStr);
  if (!cycleDay) return null;
  var phase = getPhaseForCycleDay(cycleDay, cycleLength);
  var content = STATIC_PHASE_CONTENT[phase];
  if (!content) return null;

  var miniPhrases = {
    reflect: 'You\'re in Restore mode today, and your intuition is sharpest now. Check in to keep tracking your rhythm.',
    build: 'You\'re in Rise mode today, and your brain is primed for creativity. Check in to keep your streak alive.',
    perform: 'You\'re in Peak mode today, with peak confidence and communication. Check in to capture your peak.',
    complete: 'You\'re in Sustain mode today, perfect for finishing what you started. Check in to keep the data flowing.'
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
module.exports.PHASE_CONTENT = STATIC_PHASE_CONTENT;
