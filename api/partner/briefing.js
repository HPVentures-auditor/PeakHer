/**
 * GET /api/partner/briefing
 * Partner's daily briefing — abstracted, Dot-in-partner-register voice.
 * Never reveals raw cycle data, clinical terms, or check-in scores.
 */
const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');
const { sendMessage } = require('../_lib/claude');

// Phase helpers (reuse from briefing.js)
function calculateCycleDay(lastPeriodStart, cycleLength, today) {
  var start = new Date(lastPeriodStart + 'T00:00:00Z');
  var now = new Date(today + 'T00:00:00Z');
  var diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return ((diffDays % cycleLength) + cycleLength) % cycleLength + 1;
}

function getPhaseForCycleDay(cycleDay, cycleLength) {
  if (cycleDay <= 5) return 'reflect';
  if (cycleDay <= Math.round(cycleLength * 0.5)) return 'build';
  if (cycleDay <= Math.round(cycleLength * 0.5) + 3) return 'perform';
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

function getModeEmoji(phase) {
  switch (phase) {
    case 'reflect': return '\uD83C\uDF19';
    case 'build': return '\uD83D\uDD25';
    case 'perform': return '\uD83D\uDC51';
    case 'complete': return '\uD83C\uDFAF';
    default: return '\u2728';
  }
}

function getPhaseDayRange(phase, cycleLength) {
  switch (phase) {
    case 'reflect': return { start: 1, end: 5 };
    case 'build': return { start: 6, end: Math.round(cycleLength * 0.5) };
    case 'perform': return { start: Math.round(cycleLength * 0.5) + 1, end: Math.round(cycleLength * 0.5) + 3 };
    case 'complete': return { start: Math.round(cycleLength * 0.5) + 4, end: cycleLength };
    default: return { start: 1, end: cycleLength };
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    // Verify caller is a partner
    var [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
    if (!user || user.role !== 'partner') {
      return sendError(res, 403, 'Partner Mode only');
    }

    // Find active partnership
    var [partnership] = await sql`
      SELECT p.*, u.name as primary_name
      FROM partnerships p
      JOIN users u ON u.id = p.primary_user_id
      WHERE p.partner_user_id = ${userId} AND p.status = 'active'
      LIMIT 1
    `;

    if (!partnership) {
      return sendError(res, 404, 'No active partnership found');
    }

    // Check if sharing is paused
    if (partnership.sharing_paused) {
      return res.status(200).json({
        paused: true,
        message: "She's pressed pause on sharing. This is healthy. She'll let you back in when she's ready. \u2014 Dot"
      });
    }

    var today = new Date().toISOString().split('T')[0];
    var primaryUserId = partnership.primary_user_id;
    var firstName = (partnership.primary_name || '').split(' ')[0] || 'her';

    // Check briefing cache
    var [cached] = await sql`
      SELECT briefing_json FROM partner_briefings
      WHERE partnership_id = ${partnership.id} AND date = ${today}
      LIMIT 1
    `;

    if (cached) {
      return res.status(200).json(cached.briefing_json);
    }

    // Fetch primary user's cycle data
    var [cycleProfile] = await sql`
      SELECT tracking_enabled, average_cycle_length, last_period_start, cycle_date_confidence
      FROM cycle_profiles WHERE user_id = ${primaryUserId}
    `;

    if (!cycleProfile || !cycleProfile.tracking_enabled || !cycleProfile.last_period_start) {
      return res.status(200).json({
        date: today,
        mode: null,
        headline: "She hasn't set up cycle tracking yet. Once she does, you'll get daily intel here.",
        dotSignoff: "Stand by."
      });
    }

    var cycleLength = cycleProfile.average_cycle_length || 28;
    var cycleDay = calculateCycleDay(cycleProfile.last_period_start, cycleLength, today);
    var phase = getPhaseForCycleDay(cycleDay, cycleLength);
    var modeName = getModeName(phase);
    var modeEmoji = getModeEmoji(phase);
    var phaseRange = getPhaseDayRange(phase, cycleLength);
    var dayWithinPhase = cycleDay - phaseRange.start + 1;
    var totalPhaseDays = phaseRange.end - phaseRange.start + 1;
    var isLateLuteal = (phase === 'complete' && dayWithinPhase > Math.round(totalPhaseDays * 0.6));

    // Build context based on share toggles
    var contextParts = [];
    contextParts.push('Her current mode: ' + modeName + ' (about ' + (dayWithinPhase <= totalPhaseDays / 2 ? 'early' : 'later') + ' in this mode)');

    if (partnership.share_energy_level) {
      // Fetch today's check-in if available
      var [todayCheckin] = await sql`
        SELECT energy, confidence FROM checkins
        WHERE user_id = ${primaryUserId} AND date = ${today}
        LIMIT 1
      `;
      if (todayCheckin) {
        var energyLevel = todayCheckin.energy >= 7 ? 'high' : todayCheckin.energy >= 4 ? 'moderate' : 'low';
        contextParts.push('Her energy today: ' + energyLevel);
      }

      // Recent trend
      var recentCheckins = await sql`
        SELECT energy FROM checkins
        WHERE user_id = ${primaryUserId}
        ORDER BY date DESC LIMIT 5
      `;
      if (recentCheckins.length >= 3) {
        var energies = recentCheckins.map(function (c) { return Number(c.energy); });
        var trend = energies[0] - energies[energies.length - 1];
        contextParts.push('Energy trend: ' + (trend > 1 ? 'rising' : trend < -1 ? 'falling' : 'stable'));
      }
    }

    if (partnership.share_emotional_weather && isLateLuteal) {
      contextParts.push('IMPORTANT: She is in late Sustain (pre-period). Emotional intensity is elevated. This is biological, not personal.');
    }

    // Fetch wearable sleep data (abstracted)
    if (partnership.share_energy_level) {
      var [wearable] = await sql`
        SELECT sleep_duration_min, sleep_quality_score FROM wearable_data
        WHERE user_id = ${primaryUserId} AND date >= ${today}
        ORDER BY date DESC LIMIT 1
      `;
      if (wearable && wearable.sleep_duration_min) {
        var hours = Math.round(wearable.sleep_duration_min / 60 * 10) / 10;
        var quality = hours >= 7 ? 'good' : hours >= 5.5 ? 'okay' : 'rough';
        contextParts.push('Sleep last night: ' + quality);
      }
    }

    // Get her personal message for this phase
    var phaseMessageKey = 'personal_message_' + modeName.toLowerCase();
    var personalMessage = partnership[phaseMessageKey] || null;

    if (personalMessage) {
      contextParts.push('');
      contextParts.push('HER PERSONAL MESSAGE FOR THIS PHASE (she wrote this herself, include it prominently):');
      contextParts.push('"' + personalMessage + '"');
    }

    // Build the AI prompt
    var systemPrompt = buildPartnerSystemPrompt(modeName, isLateLuteal, !!personalMessage);
    var userMessage = 'Generate today\'s partner brief.\n\nHer name: ' + firstName + '\n' + contextParts.join('\n');

    // Call Claude
    var aiResponse;
    try {
      var result = await sendMessage({
        system: systemPrompt,
        userMessage: userMessage,
        maxTokens: 1024,
        temperature: 0.7
      });
      aiResponse = JSON.parse(result.content);
    } catch (aiErr) {
      console.error('Partner briefing AI error:', aiErr.message);
      // Fallback to static content
      aiResponse = getStaticPartnerBriefing(modeName, modeEmoji, firstName, isLateLuteal);
    }

    // Build final response
    var intel = aiResponse.intel || null;
    // Ensure fromHer is included if there's a personal message
    if (intel && personalMessage && !intel.fromHer) {
      intel.fromHer = firstName + ' says: "' + personalMessage + '"';
    }

    var briefing = {
      date: today,
      mode: modeName,
      modeEmoji: modeEmoji,
      headline: aiResponse.headline || modeName + ' mode. Here\'s your intel.',
      intel: intel,
      dotSignoff: aiResponse.dotSignoff || 'You got this.'
    };

    // Cache it
    try {
      await sql`
        INSERT INTO partner_briefings (partnership_id, date, briefing_json)
        VALUES (${partnership.id}, ${today}, ${JSON.stringify(briefing)})
        ON CONFLICT (partnership_id, date) DO UPDATE SET
          briefing_json = ${JSON.stringify(briefing)},
          generated_at = now()
      `;
    } catch (cacheErr) {
      // Non-fatal
      console.error('Partner briefing cache error:', cacheErr.message);
    }

    return res.status(200).json(briefing);
  } catch (err) {
    console.error('Partner briefing error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};


function buildPartnerSystemPrompt(modeName, isLateLuteal, hasPersonalMessage) {
  var parts = [
    'You are Dot, generating a daily partner brief for PeakHer\'s Partner Mode.',
    '',
    'AUDIENCE: A man (or non-cycling partner) who wants to show up well. He does NOT need to understand hormones or cycle science. He needs to know WHAT TO DO.',
    '',
    'VOICE: Funny, direct, zero judgment. Like a buddy who happens to know biology. Think: the best man at a wedding who also has a PhD in endocrinology. Irreverent but never mean.',
    '',
    'BRAND: "Emotional intelligence for men, powered by biology."',
    '',
    'CRITICAL RULES:',
    '1. NEVER use clinical terms (luteal, follicular, estrogen, progesterone). Use mode names: Restore, Rise, Peak, Sustain.',
    '2. NEVER reveal specific cycle day numbers.',
    '3. NEVER share raw data (scores, sleep hours, HRV). Translate into actionable guidance.',
    '4. Lead with humor, follow with the action.',
    '5. Be SPECIFIC: "Bring dark chocolate and run the dishwasher" not "be supportive."',
    '6. Validate HIS experience too: "This isn\'t easy for you either. That\'s okay."',
    '7. Keep it SHORT. The whole briefing should take 60 seconds to read.',
    '8. Never use em dashes. Use commas, periods, or connecting words instead.',
    '',
    'TONE BY MODE:',
    '- Restore: Gentle, protective. "She\'s recharging. Guard the door."',
    '- Rise: Upbeat, encouraging. "She\'s on fire this week. Match her energy or get out of the way."',
    '- Peak: Hype. "She\'s magnetic today. Plan that date night."',
    '- Sustain: Real talk, practical. "The storm may be coming. Stock comfort food and don\'t take anything personally."',
    ''
  ];

  if (isLateLuteal) {
    parts.push('SPECIAL NOTE: She is in LATE Sustain (the hardest few days). Extra care needed:');
    parts.push('- Mood swings are hormonal, not about him');
    parts.push('- She may want to cancel everything and burn it all down. This is temporary.');
    parts.push('- Do NOT suggest she "just relax" or ask "what\'s wrong"');
    parts.push('- Physical comfort > conversation: blankets, snacks, silence');
    parts.push('');
  }

  if (hasPersonalMessage) {
    parts.push('PERSONAL MESSAGE: She wrote a personal note about what she needs during this phase. This is HER voice, not Dot\'s. Include it prominently in the briefing, either in the headline or as a special "From Her" section in the intel. Respect her words exactly. This is the most important part of the briefing.');
    parts.push('');
  }

  parts.push('OUTPUT FORMAT (respond with valid JSON only, no markdown):');
  parts.push('{');
  parts.push('  "headline": "Punchy, funny 8-15 word headline. Example: \'Warning: She\'s in Sustain. Proceed with snacks and emotional intelligence.\'",');
  parts.push('  "intel": {');
  parts.push('    "vibe": "2-3 sentences on how she\'s likely feeling and why, in terms he understands. No science jargon.",');
  parts.push('    "doThis": "3-4 specific, concrete actions he can take today.",');
  parts.push('    "dontDoThis": "2-3 things to avoid today. Specific enough to prevent common mistakes.",');
  parts.push('    "snackIntel": "1-2 sentences on what food/drink she\'d appreciate and a one-line cool biological reason.",');
  parts.push('    "connectionTip": "1-2 sentences on the best way to connect with her today.",');
  parts.push('    "fromHer": "If she included a personal message, include it here exactly as she wrote it, prefixed with her name. If no personal message was provided, set this to null."');
  parts.push('  },');
  parts.push('  "dotSignoff": "Punchy 3-6 word sign-off. Examples: \'Snacks. Silence. Repeat.\' / \'Match her fire.\' / \'Guard the couch.\'"');
  parts.push('}');

  return parts.join('\n');
}


function getStaticPartnerBriefing(modeName, modeEmoji, firstName, isLateLuteal) {
  var briefings = {
    'Restore': {
      headline: firstName + ' is recharging. Your job: protect the peace.',
      intel: {
        vibe: 'She\'s in Restore mode, which means her body is doing a full system reset. Energy is low, and she probably wants to be left alone with snacks and a blanket. This is biology at work, not you.',
        doThis: 'Bring her iron-rich food (red meat, spinach, dark chocolate). Handle dinner without asking. Keep the house quiet. A hot water bottle or heating pad earns hero points.',
        dontDoThis: 'Don\'t plan surprise social events. Don\'t ask "what\'s wrong" if she\'s quiet. Don\'t suggest she "push through it."',
        snackIntel: 'Dark chocolate (70%+) and warm soup. Her body is literally losing iron right now, so red meat or lentils are clutch. The chocolate craving is real science.',
        connectionTip: 'Physical presence without conversation. Sit nearby. A gentle shoulder rub. Silence is golden right now.'
      },
      dotSignoff: 'Guard the couch.'
    },
    'Rise': {
      headline: firstName + ' is on fire this week. Try to keep up.',
      intel: {
        vibe: 'She\'s in Rise mode. Her creativity and energy are climbing fast. She\'s probably starting 6 new projects, reorganizing the apartment, and full of ideas. Buckle up.',
        doThis: 'Match her energy. Say yes to plans. Be her brainstorm buddy. Try a new restaurant or activity together. She\'s open to novelty right now.',
        dontDoThis: 'Don\'t slow her down with logistics right now. Don\'t be the "let\'s be realistic" guy this week. Don\'t cancel plans.',
        snackIntel: 'Light, fresh food. Smoothies, salads, fermented stuff like kombucha. Her gut is extra receptive right now, so quality ingredients go a long way.',
        connectionTip: 'Engage with her ideas. Ask about her projects. She wants a collaborator, not a spectator.'
      },
      dotSignoff: 'Match her fire.'
    },
    'Peak': {
      headline: firstName + ' is magnetic today. Plan the date night.',
      intel: {
        vibe: 'She\'s in Peak mode. Communication skills, confidence, and charisma are literally at their biological high point. She\'s sharp, social, and probably glowing. This is her 2-3 day superpower window.',
        doThis: 'Plan a date. Have a real conversation. Compliment her specifically (not just "you look nice"). If there\'s a hard topic you\'ve been avoiding, she can handle it now.',
        dontDoThis: 'Don\'t be boring. Don\'t phone it in. Don\'t waste this window with Netflix and scrolling.',
        snackIntel: 'Anti-inflammatory foods: berries, fish, light meals. Her metabolism is running hot. She\'s burning more calories right now without trying.',
        connectionTip: 'Words and eye contact. She\'s verbal right now. Compliments land harder. Real conversation over small talk.'
      },
      dotSignoff: 'She\'s the main character. Play your part.'
    },
    'Sustain': {
      headline: 'Sustain mode. Stock the comfort food and choose your words carefully.',
      intel: {
        vibe: isLateLuteal
          ? 'She\'s in late Sustain, which is the hardest stretch. Mood swings, irritability, cravings, fatigue. This is all hormonal. She\'s not mad at you (probably). She\'s fighting her own brain chemistry right now.'
          : 'She\'s in Sustain mode. Energy is winding down. She\'s focused on finishing things, not starting new ones. The fun creative energy from earlier is gone, replaced by a need for closure and comfort.',
        doThis: isLateLuteal
          ? 'Bring dark chocolate and don\'t ask questions. Run a bath. Handle the dishes. If she cries at a dog commercial, hand her tissues and sit quietly. She knows it\'s hormones. She doesn\'t need you to point it out.'
          : 'Help her close loops. Take something off her plate. Comfort food for dinner. Respect her need for quiet evenings.',
        dontDoThis: isLateLuteal
          ? 'Do NOT say "are you on your period?" Do NOT suggest she "just relax." Do NOT start a big relationship conversation this week. Do NOT take her mood personally.'
          : 'Don\'t suggest big social plans. Don\'t start projects that need her input. Don\'t comment on food choices.',
        snackIntel: 'Complex carbs: sweet potatoes, pasta, warm bread. Dark chocolate. Her body needs 100-300 extra calories per day right now. The cravings are biological, not weakness.',
        connectionTip: isLateLuteal
          ? 'Physical comfort over conversation. Blankets, heating pad, her favorite show. Your physical presence is enough. Don\'t try to fix anything.'
          : 'Acts of service speak louder than words right now. Do a chore without being asked. That IS the love language this week.'
      },
      dotSignoff: isLateLuteal ? 'Snacks. Silence. Repeat.' : 'Close the loops together.'
    }
  };

  return briefings[modeName] || briefings['Rise'];
}
