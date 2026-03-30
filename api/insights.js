/**
 * PeakHer AI Insights Endpoint
 *
 * GET /api/insights - Returns AI-generated pattern insights, week-ahead narrative,
 * and recommendations. Caches results in DB; only regenerates when user has new check-ins.
 */
var { getDb } = require('./_lib/db');
var { getUserId, sendError } = require('./_lib/auth');
var { sendMessage, getModel } = require('./_lib/claude');
var { analyzePatterns } = require('./_lib/patterns');

var MIN_CHECKINS = 25;

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    // 1. Get all check-ins
    var checkins = await sql`
      SELECT date, energy, confidence, sleep_quality, stress_level, cycle_day, cycle_phase, notes
      FROM checkins WHERE user_id = ${userId}
      ORDER BY date DESC
    `;

    if (checkins.length < MIN_CHECKINS) {
      return res.status(200).json({
        ready: false,
        checkinCount: checkins.length,
        required: MIN_CHECKINS
      });
    }

    // 2. Check cache: only regenerate if we have new check-ins since last generation
    var latestCheckinDate = checkins[0].date instanceof Date
      ? checkins[0].date.toISOString()
      : String(checkins[0].date);

    var cached = await sql`
      SELECT pattern_insights, week_ahead_narrative, recommendations, generated_at
      FROM insights WHERE user_id = ${userId}
    `;

    if (cached.length > 0) {
      var generatedAt = new Date(cached[0].generated_at);
      var latestCheckin = new Date(latestCheckinDate);
      // If insights were generated after the latest check-in, serve cache
      if (generatedAt > latestCheckin) {
        return res.status(200).json({
          ready: true,
          cached: true,
          patternInsights: cached[0].pattern_insights,
          weekAheadNarrative: cached[0].week_ahead_narrative,
          recommendations: cached[0].recommendations,
          generatedAt: cached[0].generated_at
        });
      }
    }

    // 3. Get user profile + cycle info
    var userRows = await sql`
      SELECT name, personas FROM users WHERE id = ${userId}
    `;
    var user = userRows[0] || { name: 'there', personas: [] };

    var cycleRows = await sql`
      SELECT tracking_enabled, average_cycle_length, last_period_start
      FROM cycle_profiles WHERE user_id = ${userId}
    `;
    var cycleProfile = cycleRows.length > 0 ? cycleRows[0] : null;

    // 3b. Get streak info + run pattern detection engine
    var streakRows = await sql`
      SELECT current_streak, longest_streak, last_checkin_date
      FROM streaks WHERE user_id = ${userId}
    `;
    var streak = streakRows.length > 0 ? streakRows[0] : null;

    var patternAnalysis = analyzePatterns(checkins, cycleProfile, streak);

    // 4. Prepare check-in data for Claude
    var checkinData = checkins.map(function (c) {
      var dateStr = c.date instanceof Date ? c.date.toISOString().split('T')[0] : String(c.date);
      return {
        date: dateStr,
        energy: c.energy,
        confidence: c.confidence,
        sleepQuality: c.sleep_quality,
        stressLevel: c.stress_level,
        cycleDay: c.cycle_day,
        cyclePhase: c.cycle_phase
      };
    });

    // 5. Compute summary stats for the prompt
    var energies = checkins.map(function (c) { return c.energy; });
    var confidences = checkins.map(function (c) { return c.confidence; });
    var sleeps = checkins.filter(function (c) { return c.sleep_quality != null; }).map(function (c) { return c.sleep_quality; });
    var stresses = checkins.filter(function (c) { return c.stress_level != null; }).map(function (c) { return c.stress_level; });

    var stats = {
      totalCheckins: checkins.length,
      avgEnergy: mean(energies),
      avgConfidence: mean(confidences),
      avgSleep: sleeps.length > 0 ? mean(sleeps) : null,
      avgStress: stresses.length > 0 ? mean(stresses) : null,
      recentTrend: computeTrend(checkins.slice(0, 7), checkins.slice(7, 14))
    };

    // 6. Build Claude prompt
    var systemPrompt = buildSystemPrompt();
    var userMessage = buildUserMessage(user, cycleProfile, checkinData, stats, patternAnalysis);

    // 7. Call Claude
    var response = await sendMessage({
      system: systemPrompt,
      userMessage: userMessage,
      maxTokens: 2048,
      temperature: 0
    });

    if (response.skipped) {
      return sendError(res, 503, 'AI service not configured');
    }

    // 8. Parse JSON response
    var parsed = parseClaudeResponse(response.content);
    if (!parsed) {
      console.error('PeakHer Insights: Failed to parse Claude response:', response.content.substring(0, 500));
      return sendError(res, 500, 'Failed to parse AI response');
    }

    // 9. Upsert into insights table
    await sql`
      INSERT INTO insights (user_id, pattern_insights, week_ahead_narrative, recommendations, model_used, input_tokens, output_tokens, generated_at)
      VALUES (
        ${userId},
        ${JSON.stringify(parsed.patternInsights)},
        ${JSON.stringify(parsed.weekAheadNarrative)},
        ${JSON.stringify(parsed.recommendations)},
        ${response.model},
        ${response.inputTokens},
        ${response.outputTokens},
        now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        pattern_insights = EXCLUDED.pattern_insights,
        week_ahead_narrative = EXCLUDED.week_ahead_narrative,
        recommendations = EXCLUDED.recommendations,
        model_used = EXCLUDED.model_used,
        input_tokens = EXCLUDED.input_tokens,
        output_tokens = EXCLUDED.output_tokens,
        generated_at = now()
    `;

    return res.status(200).json({
      ready: true,
      cached: false,
      patternInsights: parsed.patternInsights,
      weekAheadNarrative: parsed.weekAheadNarrative,
      recommendations: parsed.recommendations,
      generatedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('Insights error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};

// ── Helpers ───────────────────────────────────────────────────────────

function mean(arr) {
  if (arr.length === 0) return 0;
  var sum = 0;
  for (var i = 0; i < arr.length; i++) sum += arr[i];
  return Math.round((sum / arr.length) * 10) / 10;
}

function computeTrend(recent, previous) {
  if (recent.length === 0 || previous.length === 0) return null;
  var recentEnergy = mean(recent.map(function (c) { return c.energy; }));
  var prevEnergy = mean(previous.map(function (c) { return c.energy; }));
  var recentConf = mean(recent.map(function (c) { return c.confidence; }));
  var prevConf = mean(previous.map(function (c) { return c.confidence; }));
  return {
    energyDelta: Math.round((recentEnergy - prevEnergy) * 10) / 10,
    confidenceDelta: Math.round((recentConf - prevConf) * 10) / 10
  };
}

function buildSystemPrompt() {
  return [
    'You are Ava, PeakHer\'s performance intelligence analyst.',
    'You help women understand their energy, confidence, and performance patterns.',
    'Your tone is warm, evidence-based, and peer-to-peer, like a brilliant friend who happens to be a data scientist.',
    'Never condescending. Never clinical. Always actionable.',
    '',
    'You MUST respond with valid JSON only. No markdown, no explanation outside the JSON.',
    'Follow this exact schema:',
    '{',
    '  "patternInsights": [',
    '    {',
    '      "id": "unique-string",',
    '      "title": "Short headline (5-8 words)",',
    '      "description": "2-3 sentence insight explaining the pattern and why it matters",',
    '      "type": "sleep"|"stress"|"cycle"|"weekday"|"trend",',
    '      "sentiment": "positive"|"negative"|"neutral",',
    '      "actionTip": "One specific, actionable suggestion"',
    '    }',
    '  ],',
    '  "weekAheadNarrative": {',
    '    "summary": "2-3 sentence overview of what to expect this week based on patterns",',
    '    "bestDayTip": "Which day looks best and what to schedule then",',
    '    "watchOut": "One thing to watch for this week (or null if nothing concerning)",',
    '    "cycleContext": "How their cycle phase affects this week (or null if not tracking)"',
    '  },',
    '  "recommendations": [',
    '    {',
    '      "id": "unique-string",',
    '      "text": "Specific actionable recommendation (1-2 sentences)",',
    '      "priority": "high"|"medium"|"low",',
    '      "category": "sleep"|"stress"|"energy"|"confidence"|"routine"',
    '    }',
    '  ]',
    '}',
    '',
    'Return 3-5 pattern insights, exactly 1 week-ahead narrative, and 2-4 recommendations.',
    'Ground every insight in the actual data. Reference specific numbers, days, or trends.',
    'If cycle data is not available, omit cycle-related insights and set cycleContext to null.'
  ].join('\n');
}

function buildUserMessage(user, cycleProfile, checkins, stats, patternAnalysis) {
  var parts = [];

  parts.push('Here is the check-in data for ' + (user.name || 'this user') + '.');
  if (user.personas && user.personas.length > 0) {
    parts.push('Personas: ' + user.personas.join(', '));
  }
  parts.push('');

  // Cycle info
  if (cycleProfile && cycleProfile.tracking_enabled) {
    parts.push('CYCLE PROFILE:');
    parts.push('- Tracking: enabled');
    parts.push('- Average cycle length: ' + cycleProfile.average_cycle_length + ' days');
    if (cycleProfile.last_period_start) {
      parts.push('- Last period start: ' + cycleProfile.last_period_start);
    }
    parts.push('');
  }

  // Summary stats
  parts.push('SUMMARY STATS:');
  parts.push('- Total check-ins: ' + stats.totalCheckins);
  parts.push('- Average energy: ' + stats.avgEnergy + '/10');
  parts.push('- Average confidence: ' + stats.avgConfidence + '/10');
  if (stats.avgSleep !== null) parts.push('- Average sleep quality: ' + stats.avgSleep + '/10');
  if (stats.avgStress !== null) parts.push('- Average stress level: ' + stats.avgStress + '/10');
  if (stats.recentTrend) {
    var eTrend = stats.recentTrend.energyDelta >= 0 ? '+' : '';
    var cTrend = stats.recentTrend.confidenceDelta >= 0 ? '+' : '';
    parts.push('- Recent trend (last 7 vs prior 7): energy ' + eTrend + stats.recentTrend.energyDelta + ', confidence ' + cTrend + stats.recentTrend.confidenceDelta);
  }
  parts.push('');

  // Pattern detection engine results
  if (patternAnalysis && patternAnalysis.patterns && patternAnalysis.patterns.length > 0) {
    parts.push('DETECTED PATTERNS (from statistical analysis engine):');
    parts.push('Data quality: ' + patternAnalysis.summary.dataQuality + ' (' + patternAnalysis.summary.totalCheckins + ' check-ins)');
    parts.push('Date range: ' + patternAnalysis.summary.dateRange.start + ' to ' + patternAnalysis.summary.dateRange.end);
    parts.push('');
    for (var i = 0; i < patternAnalysis.patterns.length; i++) {
      var p = patternAnalysis.patterns[i];
      parts.push('  ' + (i + 1) + '. [' + p.type.toUpperCase() + '] (confidence: ' + Math.round(p.confidenceScore * 100) + '%, ' + p.dataPointsUsed + ' data points, ' + (p.positive ? 'positive' : 'negative') + ')');
      parts.push('     ' + p.description);
      if (p.metadata) {
        var metaKeys = Object.keys(p.metadata);
        var metaParts = [];
        for (var j = 0; j < metaKeys.length; j++) {
          metaParts.push(metaKeys[j] + '=' + p.metadata[metaKeys[j]]);
        }
        parts.push('     Metadata: ' + metaParts.join(', '));
      }
      parts.push('');
    }
    parts.push('Use these statistically-detected patterns as the foundation for your insights. Validate them against the raw check-in data, add narrative context, and make them actionable. If a pattern contradicts what you see in the raw data, note the discrepancy.');
    parts.push('');
  } else if (patternAnalysis) {
    parts.push('PATTERN ANALYSIS: No statistically significant patterns detected yet (data quality: ' + patternAnalysis.summary.dataQuality + '). Generate insights from the raw check-in data and summary stats.');
    parts.push('');
  }

  // Recent check-ins (last 30 for context, all for stats)
  var recentCheckins = checkins.slice(0, 30);
  parts.push('RECENT CHECK-INS (last 30 days, newest first):');
  parts.push(JSON.stringify(recentCheckins, null, 1));

  return parts.join('\n');
}

function parseClaudeResponse(content) {
  try {
    // Try direct JSON parse first
    var parsed = JSON.parse(content);
    return validateResponse(parsed);
  } catch (e) {
    // Try to extract JSON from markdown code block
    var match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        var parsed2 = JSON.parse(match[1].trim());
        return validateResponse(parsed2);
      } catch (e2) {
        // fall through
      }
    }

    // Try to find JSON object in the response
    var braceStart = content.indexOf('{');
    var braceEnd = content.lastIndexOf('}');
    if (braceStart !== -1 && braceEnd > braceStart) {
      try {
        var parsed3 = JSON.parse(content.substring(braceStart, braceEnd + 1));
        return validateResponse(parsed3);
      } catch (e3) {
        // fall through
      }
    }

    return null;
  }
}

function validateResponse(parsed) {
  if (!parsed) return null;

  // Ensure required fields exist with defaults
  var result = {
    patternInsights: Array.isArray(parsed.patternInsights) ? parsed.patternInsights : [],
    weekAheadNarrative: parsed.weekAheadNarrative && typeof parsed.weekAheadNarrative === 'object'
      ? parsed.weekAheadNarrative
      : { summary: null, bestDayTip: null, watchOut: null, cycleContext: null },
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
  };

  return result;
}
