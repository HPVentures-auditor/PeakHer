/**
 * PeakHer SMS Webhook — Twilio incoming message handler
 *
 * POST /api/sms/webhook
 *
 * Receives inbound SMS from Twilio and implements a conversational
 * check-in flow. Looks up user by phone number and processes messages:
 *
 *   - Number 1-10: interpreted based on conversation state
 *   - "check in" / "checkin": starts check-in flow
 *   - "STOP": unsubscribe from SMS
 *   - "help" / "?": usage instructions
 *   - Free text: logged as a note
 *
 * Returns TwiML responses. No auth header — validated via Twilio signature.
 */

var { getDb } = require('../_lib/db');
var { twimlResponse, twimlEmpty, validateWebhook } = require('../_lib/twilio');
var { sendSMS } = require('../_lib/twilio');

// Rate limiting: track requests per phone number
var rateLimitMap = {};
var RATE_LIMIT_WINDOW = 60000; // 1 minute
var RATE_LIMIT_MAX = 10; // max messages per minute

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).set('Content-Type', 'text/xml').send(twimlEmpty());
  }

  // Set TwiML content type for all responses
  res.setHeader('Content-Type', 'text/xml');

  var body = req.body || {};
  var from = (body.From || '').trim();
  var messageBody = (body.Body || '').trim();
  var messageSid = body.MessageSid || '';

  if (!from || !messageBody) {
    return res.status(200).send(twimlEmpty());
  }

  // Rate limiting
  var now = Date.now();
  if (!rateLimitMap[from]) {
    rateLimitMap[from] = { count: 0, windowStart: now };
  }
  var rl = rateLimitMap[from];
  if (now - rl.windowStart > RATE_LIMIT_WINDOW) {
    rl.count = 0;
    rl.windowStart = now;
  }
  rl.count++;
  if (rl.count > RATE_LIMIT_MAX) {
    return res.status(200).send(twimlResponse('Slow down! Too many messages. Try again in a minute.'));
  }

  var sql = getDb();

  try {
    // Log inbound message
    await logSms(sql, null, from, 'inbound', messageSid, messageBody, 'received');

    // Look up user by phone number
    var users = await sql`
      SELECT u.id, u.name, u.phone_number, u.phone_verified, u.sms_enabled, u.sms_timezone,
             cp.last_period_start, cp.average_cycle_length, cp.tracking_enabled,
             s.current_streak
      FROM users u
      LEFT JOIN cycle_profiles cp ON cp.user_id = u.id
      LEFT JOIN streaks s ON s.user_id = u.id
      WHERE u.phone_number = ${from} AND u.phone_verified = true
      LIMIT 1
    `;

    if (users.length === 0) {
      var reply = 'Hey! I don\'t recognize this number. Sign up at peakher.ai and add your phone number in settings to get started.';
      await logSms(sql, null, from, 'outbound', null, reply, 'sent');
      return res.status(200).send(twimlResponse(reply));
    }

    var user = users[0];
    var input = messageBody.toLowerCase().trim();

    // Handle STOP
    if (input === 'stop' || input === 'unsubscribe' || input === 'cancel' || input === 'quit') {
      await sql`UPDATE users SET sms_enabled = false WHERE id = ${user.id}`;
      var stopReply = 'You\'ve been unsubscribed from PeakHer SMS. You can re-enable anytime at peakher.ai. We\'ll miss you!';
      await logSms(sql, user.id, from, 'outbound', null, stopReply, 'sent');
      return res.status(200).send(twimlResponse(stopReply));
    }

    // Handle START / re-subscribe
    if (input === 'start' || input === 'subscribe' || input === 'unstop') {
      await sql`UPDATE users SET sms_enabled = true WHERE id = ${user.id}`;
      var startReply = 'Welcome back! SMS briefings are re-enabled. You\'ll get your daily briefing at your scheduled time.';
      await logSms(sql, user.id, from, 'outbound', null, startReply, 'sent');
      return res.status(200).send(twimlResponse(startReply));
    }

    // Handle help
    if (input === 'help' || input === '?' || input === 'info') {
      var helpReply = 'PeakHer SMS Commands:\n\n' +
        '"check in" - Start a daily check-in\n' +
        'A number 1-10 - Quick energy rating\n' +
        '"done" - Finish check-in\n' +
        '"STOP" - Unsubscribe\n' +
        '"START" - Re-subscribe\n' +
        'Any text - Logged as a note\n\n' +
        'Questions? Visit peakher.ai';
      await logSms(sql, user.id, from, 'outbound', null, helpReply, 'sent');
      return res.status(200).send(twimlResponse(helpReply));
    }

    // Get or create conversation state
    var states = await sql`
      SELECT state, pending_data FROM sms_conversation_state WHERE user_id = ${user.id}
    `;
    var convState = states.length > 0 ? states[0] : { state: 'idle', pending_data: {} };
    var pending = convState.pending_data || {};

    // Route based on conversation state
    var reply = '';

    if (input === 'check in' || input === 'checkin' || input === 'check-in' || input === 'ci') {
      // Start check-in flow
      reply = 'Let\'s do it! How\'s your energy today? (1-10)';
      await upsertConvState(sql, user.id, 'awaiting_energy', {});
      await logSms(sql, user.id, from, 'outbound', null, reply, 'sent');
      return res.status(200).send(twimlResponse(reply));
    }

    // Check if input is a number 1-10
    var numericInput = parseFloat(input);
    var isRating = Number.isFinite(numericInput) && numericInput >= 1 && numericInput <= 10 && String(Math.round(numericInput)) === input;

    if (isRating) {
      var rating = Math.round(numericInput);

      switch (convState.state) {
        case 'awaiting_energy':
          pending.energy = rating;
          reply = 'Energy: ' + rating + ' ' + getEnergyEmoji(rating) + ' Nice! How\'s your confidence? (1-10)';
          await upsertConvState(sql, user.id, 'awaiting_confidence', pending);
          await logSms(sql, user.id, from, 'outbound', null, reply, 'sent');
          return res.status(200).send(twimlResponse(reply));

        case 'awaiting_confidence':
          pending.confidence = rating;
          // Save the check-in with energy + confidence
          var checkinResult = await saveCheckin(sql, user, pending);
          var insight = await buildInsight(sql, user, pending);
          reply = 'Confidence: ' + rating + ' ' + getConfidenceEmoji(rating) + ' ' + insight +
            '\n\nAnything else? (sleep, stress, wins, notes -- or "done")';
          await upsertConvState(sql, user.id, 'awaiting_extras', pending);
          await logSms(sql, user.id, from, 'outbound', null, reply, 'sent');
          return res.status(200).send(twimlResponse(reply));

        case 'idle':
        default:
          // A number with no context — start energy flow
          pending.energy = rating;
          reply = 'Energy: ' + rating + ' ' + getEnergyEmoji(rating) + ' Got it! How\'s your confidence? (1-10)';
          await upsertConvState(sql, user.id, 'awaiting_confidence', pending);
          await logSms(sql, user.id, from, 'outbound', null, reply, 'sent');
          return res.status(200).send(twimlResponse(reply));
      }
    }

    // Handle "done" to finish check-in
    if (input === 'done' || input === 'finish' || input === 'that\'s it' || input === 'thats it') {
      if (convState.state === 'awaiting_extras' || convState.state === 'awaiting_confidence') {
        // If they haven't provided confidence yet, save with just energy
        if (!pending.confidence && pending.energy) {
          pending.confidence = pending.energy; // default confidence = energy
          await saveCheckin(sql, user, pending);
        }
        var phaseMsg = getPhaseMessage(user);
        reply = 'Logged! ' + (phaseMsg ? phaseMsg + ' ' : '') + 'Have an amazing day!';
        await upsertConvState(sql, user.id, 'idle', {});
        await logSms(sql, user.id, from, 'outbound', null, reply, 'sent');
        return res.status(200).send(twimlResponse(reply));
      }
      reply = 'Nothing to finish! Text "check in" to start, or just send your energy level (1-10).';
      await logSms(sql, user.id, from, 'outbound', null, reply, 'sent');
      return res.status(200).send(twimlResponse(reply));
    }

    // Handle extra data during awaiting_extras state
    if (convState.state === 'awaiting_extras') {
      var extras = parseExtras(input);
      if (extras.notes || extras.sleepQuality || extras.stressLevel) {
        // Update the check-in with extras
        await updateCheckinExtras(sql, user.id, extras);
        var parts = [];
        if (extras.sleepQuality) parts.push('Sleep: ' + extras.sleepQuality + '/10');
        if (extras.stressLevel) parts.push('Stress: ' + extras.stressLevel + '/10');
        if (extras.notes) parts.push('Note: ' + extras.notes);
        reply = 'Updated! ' + parts.join(', ') + '\n\nMore? Or text "done" to wrap up.';
        await logSms(sql, user.id, from, 'outbound', null, reply, 'sent');
        return res.status(200).send(twimlResponse(reply));
      }
    }

    // Default: treat as a note and log it
    if (messageBody.length > 0) {
      var today = new Date().toISOString().split('T')[0];
      // Append as note to today's check-in if one exists
      var existingCheckins = await sql`
        SELECT id, notes FROM checkins WHERE user_id = ${user.id} AND date = ${today} LIMIT 1
      `;
      if (existingCheckins.length > 0) {
        var existingNotes = existingCheckins[0].notes || '';
        var newNotes = existingNotes ? existingNotes + ' | ' + messageBody : messageBody;
        if (newNotes.length > 2000) newNotes = newNotes.substring(0, 2000);
        await sql`UPDATE checkins SET notes = ${newNotes} WHERE id = ${existingCheckins[0].id}`;
        reply = 'Noted! Added to today\'s check-in. Text "check in" anytime to log energy + confidence.';
      } else {
        reply = 'Got it! Text "check in" to start your daily check-in, or just send a number 1-10 for your energy level.';
      }
      await logSms(sql, user.id, from, 'outbound', null, reply, 'sent');
      return res.status(200).send(twimlResponse(reply));
    }

    return res.status(200).send(twimlEmpty());
  } catch (err) {
    console.error('SMS webhook error:', err.message);
    // Still return 200 so Twilio doesn't retry
    return res.status(200).send(twimlResponse('Oops, something went wrong on our end. Try again in a moment!'));
  }
};


// ── Helpers ────────────────────────────────────────────────────────────────

async function upsertConvState(sql, userId, state, pendingData) {
  await sql`
    INSERT INTO sms_conversation_state (user_id, state, pending_data, updated_at)
    VALUES (${userId}, ${state}, ${JSON.stringify(pendingData)}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      state = EXCLUDED.state,
      pending_data = EXCLUDED.pending_data,
      updated_at = now()
  `;
}

async function saveCheckin(sql, user, pending) {
  var today = new Date().toISOString().split('T')[0];
  var energy = pending.energy || 5;
  var confidence = pending.confidence || energy;
  var cycleDay = null;
  var cyclePhase = null;

  // Calculate cycle day if tracking
  if (user.tracking_enabled && user.last_period_start) {
    var periodStr = user.last_period_start instanceof Date
      ? user.last_period_start.toISOString().split('T')[0]
      : String(user.last_period_start);
    var cycleLength = user.average_cycle_length || 28;
    var startDate = new Date(periodStr);
    var todayDate = new Date(today);
    var diffMs = todayDate.getTime() - startDate.getTime();
    if (diffMs >= 0) {
      var daysDiff = Math.floor(diffMs / 86400000);
      cycleDay = (daysDiff % cycleLength) + 1;
      // Determine phase
      var scale = cycleLength / 28;
      var reflectEnd = Math.round(5 * scale);
      var buildEnd = Math.round(14 * scale);
      var performEnd = Math.round(17 * scale);
      if (cycleDay <= reflectEnd) cyclePhase = 'reflect';
      else if (cycleDay <= buildEnd) cyclePhase = 'build';
      else if (cycleDay <= performEnd) cyclePhase = 'perform';
      else cyclePhase = 'complete';
    }
  }

  await sql`
    INSERT INTO checkins (user_id, date, energy, confidence, cycle_day, cycle_phase)
    VALUES (${user.id}, ${today}, ${energy}, ${confidence}, ${cycleDay}, ${cyclePhase})
    ON CONFLICT (user_id, date) DO UPDATE SET
      energy = EXCLUDED.energy,
      confidence = EXCLUDED.confidence,
      cycle_day = EXCLUDED.cycle_day,
      cycle_phase = EXCLUDED.cycle_phase,
      created_at = now()
  `;

  // Update streak
  await updateStreak(sql, user.id, today);

  return { energy: energy, confidence: confidence };
}

async function updateStreak(sql, userId, dateStr) {
  var dates = await sql`
    SELECT DISTINCT date FROM checkins WHERE user_id = ${userId} ORDER BY date DESC
  `;
  if (dates.length === 0) {
    await sql`UPDATE streaks SET current_streak = 0, last_checkin_date = NULL WHERE user_id = ${userId}`;
    return;
  }
  var current = 1;
  for (var i = 1; i < dates.length; i++) {
    var prev = new Date(dates[i - 1].date);
    var curr = new Date(dates[i].date);
    var diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      current++;
    } else {
      break;
    }
  }
  var lastDate = dates[0].date instanceof Date ? dates[0].date.toISOString().split('T')[0] : String(dates[0].date);
  await sql`
    UPDATE streaks SET
      current_streak = ${current},
      longest_streak = GREATEST(longest_streak, ${current}),
      last_checkin_date = ${lastDate}
    WHERE user_id = ${userId}
  `;
  return current;
}

async function updateCheckinExtras(sql, userId, extras) {
  var today = new Date().toISOString().split('T')[0];
  var sets = [];

  if (extras.sleepQuality) {
    await sql`UPDATE checkins SET sleep_quality = ${extras.sleepQuality} WHERE user_id = ${userId} AND date = ${today}`;
  }
  if (extras.stressLevel) {
    await sql`UPDATE checkins SET stress_level = ${extras.stressLevel} WHERE user_id = ${userId} AND date = ${today}`;
  }
  if (extras.notes) {
    var existing = await sql`SELECT notes FROM checkins WHERE user_id = ${userId} AND date = ${today} LIMIT 1`;
    var currentNotes = (existing.length > 0 && existing[0].notes) ? existing[0].notes : '';
    var combined = currentNotes ? currentNotes + ' | ' + extras.notes : extras.notes;
    if (combined.length > 2000) combined = combined.substring(0, 2000);
    await sql`UPDATE checkins SET notes = ${combined} WHERE user_id = ${userId} AND date = ${today}`;
  }
}

function parseExtras(input) {
  var result = { sleepQuality: null, stressLevel: null, notes: null };
  var lower = input.toLowerCase();

  // Check for "sleep X" or "sleep: X"
  var sleepMatch = lower.match(/sleep[:\s]+(\d+)/);
  if (sleepMatch) {
    var sleepVal = parseInt(sleepMatch[1], 10);
    if (sleepVal >= 1 && sleepVal <= 10) result.sleepQuality = sleepVal;
  }

  // Check for "stress X" or "stress: X"
  var stressMatch = lower.match(/stress[:\s]+(\d+)/);
  if (stressMatch) {
    var stressVal = parseInt(stressMatch[1], 10);
    if (stressVal >= 1 && stressVal <= 10) result.stressLevel = stressVal;
  }

  // Check for keywords that suggest a note
  var sleepWords = ['slept great', 'slept well', 'slept badly', 'slept terrible', 'couldn\'t sleep', 'insomnia', 'great sleep', 'bad sleep', 'good sleep'];
  var noteKeywords = ['win', 'won', 'crushed', 'nailed', 'struggled', 'tough', 'rough', 'amazing', 'grateful', 'anxious', 'excited', 'tired'];

  var isNote = false;
  for (var i = 0; i < sleepWords.length; i++) {
    if (lower.indexOf(sleepWords[i]) !== -1) { isNote = true; break; }
  }
  if (!isNote) {
    for (var j = 0; j < noteKeywords.length; j++) {
      if (lower.indexOf(noteKeywords[j]) !== -1) { isNote = true; break; }
    }
  }

  // If no structured data found, treat the whole thing as a note
  if (!result.sleepQuality && !result.stressLevel) {
    result.notes = input;
  } else if (isNote) {
    // Remove the structured parts and keep the rest as notes
    var cleaned = input.replace(/sleep[:\s]+\d+/gi, '').replace(/stress[:\s]+\d+/gi, '').trim();
    if (cleaned.length > 0) result.notes = cleaned;
  }

  return result;
}

async function buildInsight(sql, user, pending) {
  var streak = user.current_streak || 0;
  var energy = pending.energy || 5;
  var confidence = pending.confidence || 5;

  // Get recent average for comparison
  var sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  var sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  var recentCheckins = await sql`
    SELECT energy, confidence FROM checkins
    WHERE user_id = ${user.id} AND date >= ${sevenDaysAgoStr}
    ORDER BY date DESC
  `;

  var parts = [];

  if (recentCheckins.length >= 3) {
    var avgEnergy = 0;
    var avgConf = 0;
    for (var i = 0; i < recentCheckins.length; i++) {
      avgEnergy += Number(recentCheckins[i].energy);
      avgConf += Number(recentCheckins[i].confidence);
    }
    avgEnergy = Math.round((avgEnergy / recentCheckins.length) * 10) / 10;
    avgConf = Math.round((avgConf / recentCheckins.length) * 10) / 10;

    if (energy > avgEnergy + 1) {
      parts.push('Above your avg energy!');
    } else if (energy < avgEnergy - 1) {
      parts.push('Below your avg energy today.');
    }

    if (confidence > avgConf + 1) {
      parts.push('Confidence is up!');
    }
  }

  // Phase insight
  var phaseMsg = getPhaseMessage(user);
  if (phaseMsg) parts.push(phaseMsg);

  // Streak
  if (streak > 0) {
    parts.push('Streak: ' + (streak + 1) + ' days!');
  }

  return parts.length > 0 ? parts.join(' ') : 'Check-in logged!';
}

function getPhaseMessage(user) {
  if (!user.tracking_enabled || !user.last_period_start) return null;

  var periodStr = user.last_period_start instanceof Date
    ? user.last_period_start.toISOString().split('T')[0]
    : String(user.last_period_start);
  var cycleLength = user.average_cycle_length || 28;
  var today = new Date().toISOString().split('T')[0];
  var startDate = new Date(periodStr);
  var todayDate = new Date(today);
  var diffMs = todayDate.getTime() - startDate.getTime();
  if (diffMs < 0) return null;

  var daysDiff = Math.floor(diffMs / 86400000);
  var cycleDay = (daysDiff % cycleLength) + 1;
  var scale = cycleLength / 28;
  var reflectEnd = Math.round(5 * scale);
  var buildEnd = Math.round(14 * scale);
  var performEnd = Math.round(17 * scale);

  var phase;
  if (cycleDay <= reflectEnd) phase = 'reflect';
  else if (cycleDay <= buildEnd) phase = 'build';
  else if (cycleDay <= performEnd) phase = 'perform';
  else phase = 'complete';

  var phaseNames = {
    reflect: 'Reflect',
    build: 'Build',
    perform: 'Perform',
    complete: 'Complete'
  };

  var phaseEmojis = {
    reflect: '\uD83C\uDF19',
    build: '\uD83D\uDE80',
    perform: '\u2B50',
    complete: '\uD83C\uDFAF'
  };

  return 'Day ' + cycleDay + ' ' + phaseEmojis[phase] + ' ' + phaseNames[phase] + ' mode.';
}

function getEnergyEmoji(n) {
  if (n >= 8) return '\uD83D\uDD25';
  if (n >= 6) return '\u2728';
  if (n >= 4) return '\uD83D\uDE0A';
  return '\uD83D\uDCA4';
}

function getConfidenceEmoji(n) {
  if (n >= 8) return '\uD83D\uDCAA';
  if (n >= 6) return '\uD83D\uDE0E';
  if (n >= 4) return '\uD83D\uDE42';
  return '\uD83E\uDD17';
}

async function logSms(sql, userId, phone, direction, sid, body, status) {
  try {
    await sql`
      INSERT INTO sms_log (user_id, phone_number, direction, message_sid, body, status)
      VALUES (${userId}, ${phone}, ${direction}, ${sid}, ${(body || '').substring(0, 1600)}, ${status})
    `;
  } catch (err) {
    console.error('SMS log write failed:', err.message);
  }
}
