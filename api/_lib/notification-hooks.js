/**
 * PeakHer Morning Notification Hooks
 *
 * Phase-specific "open loop" messages from Dot that make users
 * NEED to open the app. Each message gives just enough hormonal
 * intelligence to feel seen, but not enough to feel satisfied.
 *
 * Rules:
 *   - 1-2 sentences max (push notification length)
 *   - Lead with a hormone insight or phase-specific observation
 *   - End with an open loop (incomplete information requiring the app)
 *   - Sound like a text from a smart friend, not an app reminder
 *   - No em dashes. Use periods, colons, commas, or ellipses.
 *   - Phase names: Restore, Rise, Peak, Sustain
 */

// ── Message pools (7+ per phase, rotated daily) ───────────────────────

var HOOKS = {
  restore: [
    "Your cortisol is naturally lower today. There's one thing on your schedule Dot wants to flag.",
    "Iron absorption peaks during Restore. I picked 3 foods your body is actually asking for today.",
    "Your brain hemispheres are syncing more than usual right now. There's something you should journal about.",
    "Progesterone just bottomed out. Your intuition is sharper than you think... Dot left you a note.",
    "Your inflammation markers are lowest this week. There's one workout move I want you to try today.",
    "Your pain sensitivity is higher, but so is your creativity. I rearranged your priorities.",
    "Melatonin is elevated during Restore. Your sleep architecture is different right now. Check what I adjusted.",
    "Your immune system is doing a quiet reset. There's one thing I moved off your plate today.",
    "Prostaglandins are high. That achy feeling has a purpose. I built today's plan around it."
  ],

  rise: [
    "Estrogen is climbing. Your verbal processing speed is about to peak. Check what Dot moved to today.",
    "Your hippocampus literally grew overnight. There's a skill you should start learning this week.",
    "Recovery time is at its shortest this cycle. Dot upgraded your workout.",
    "Testosterone is rising with estrogen. Your risk tolerance just shifted. There's a decision I flagged.",
    "Your dopamine receptors are more sensitive right now. I found the perfect window for deep work today.",
    "Estrogen is boosting your memory encoding. There's one thing worth studying today.",
    "Your metabolism just shifted gears. The fasting window I set for today is different from last week.",
    "Collagen synthesis peaks in Rise. Your skin, joints, and gut lining are all rebuilding. I adjusted your nutrition.",
    "Your pain threshold is at its highest. There's something bold on your calendar Dot wants you to keep."
  ],

  peak: [
    "You're in your sharpest 48 hours this month. Dot has a plan.",
    "Your confidence peaks with estrogen today. There's one conversation you should have.",
    "Verbal fluency is at max. That thing you've been avoiding saying? Today your brain can find the exact right words.",
    "Luteinizing hormone just surged. Your social magnetism is peaking. I moved something important to today.",
    "Testosterone hit its cycle high. Your negotiation instincts are razor sharp. Check what I queued up.",
    "Your pheromone output peaks during these 48 hours. There's a meeting I want you to own today.",
    "Estrogen just peaked. Your working memory is fastest right now. I loaded today's brief with actions.",
    "Your pain tolerance and energy are both maxed out. There's one hard thing I scheduled for today."
  ],

  sustain: [
    "Progesterone just peaked. There's one thing you should move on your calendar today.",
    "Serotonin dips this week. Dot picked foods your body is craving for a reason.",
    "Your brain is shifting to detail mode. There's a task Dot moved to today that you'll crush.",
    "Your basal body temperature rose overnight. Your metabolism is running hotter. Check what I changed in your nutrition.",
    "GABA is elevated from progesterone. You'll focus better alone today. I reorganized your schedule.",
    "Your body is burning more calories at rest right now. The meal plan I built reflects that.",
    "Progesterone is making your gut slower. There are 3 foods I want you to swap out today.",
    "Your emotional processing deepens in Sustain. There's a reflection Dot prepared for you.",
    "Late Sustain can feel heavy. It's not you, it's biochemistry. I built today to work with it, not against it."
  ]
};

// ── Internal phase name mapping ───────────────────────────────────────
// The DB uses reflect/build/perform/complete internally.
// Consumer-facing uses Restore/Rise/Peak/Sustain.
// This module maps internal names to hook pool keys.

var PHASE_TO_HOOK_KEY = {
  reflect: 'restore',
  build: 'rise',
  perform: 'peak',
  complete: 'sustain',
  // Also accept the consumer names directly
  restore: 'restore',
  rise: 'rise',
  peak: 'peak',
  sustain: 'sustain'
};

/**
 * Get a notification hook message for a given phase.
 * Avoids repeating the last message sent to this user.
 *
 * @param {string} phase - Internal phase name (reflect/build/perform/complete)
 *                         or consumer name (restore/rise/peak/sustain)
 * @param {number|null} lastIndex - Index of the last message sent for this phase (or null)
 * @returns {{ message: string, index: number, hookKey: string }}
 */
function getNotificationHook(phase, lastIndex) {
  var hookKey = PHASE_TO_HOOK_KEY[phase] || 'rise';
  var pool = HOOKS[hookKey];

  // Pick a random index that isn't the last one sent
  var index;
  if (pool.length <= 1) {
    index = 0;
  } else {
    var attempts = 0;
    do {
      index = Math.floor(Math.random() * pool.length);
      attempts++;
    } while (index === lastIndex && attempts < 10);
  }

  return {
    message: pool[index],
    index: index,
    hookKey: hookKey
  };
}

/**
 * Get the consumer-facing phase display name.
 * @param {string} phase - Internal or consumer phase name
 * @returns {string}
 */
function getPhaseDisplayName(phase) {
  var hookKey = PHASE_TO_HOOK_KEY[phase] || 'rise';
  switch (hookKey) {
    case 'restore': return 'Restore';
    case 'rise': return 'Rise';
    case 'peak': return 'Peak';
    case 'sustain': return 'Sustain';
    default: return 'Rise';
  }
}

module.exports = {
  getNotificationHook: getNotificationHook,
  getPhaseDisplayName: getPhaseDisplayName,
  HOOKS: HOOKS,
  PHASE_TO_HOOK_KEY: PHASE_TO_HOOK_KEY
};
