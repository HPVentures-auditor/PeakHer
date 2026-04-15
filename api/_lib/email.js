/**
 * PeakHer Email Module: GHL (GoHighLevel) integration
 *
 * Sends emails via GHL conversations API using the PeakHer location.
 * Requires GHL_PEAKHER_API_KEY + GHL_PEAKHER_LOCATION_ID env vars.
 */

var ghl = require('./ghl');

/**
 * Send an email via GHL.
 * options: { to, subject, html, firstName?, contactOptions? }
 */
async function sendEmail(options) {
  var to = Array.isArray(options.to) ? options.to[0] : options.to;
  var contactOpts = options.contactOptions || {};
  if (options.firstName) contactOpts.firstName = options.firstName;
  return ghl.sendEmailToAddress(to, options.subject, options.html, contactOpts);
}

// ── Email Templates ──────────────────────────────────────────────────

function welcomeEmail(name) {
  return {
    subject: 'Welcome to PeakHer, ' + name + '!',
    html: '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
      '<body style="margin:0;padding:0;background:#0a1628;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">' +
      '<div style="max-width:560px;margin:0 auto;padding:40px 24px;">' +
        '<div style="text-align:center;margin-bottom:32px;">' +
          '<span style="font-size:15px;font-weight:800;letter-spacing:4px;color:#2d8a8a;text-transform:uppercase;">PEAKHER</span>' +
        '</div>' +
        '<div style="background:#0f2035;border-radius:12px;padding:32px 24px;border:1px solid rgba(255,255,255,0.06);">' +
          '<h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 12px;">Welcome, ' + escapeHtml(name) + '!</h1>' +
          '<p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 20px;">' +
            'You\'re in. PeakHer tracks your energy, confidence, and daily rhythm so you can see the patterns behind your performance.' +
          '</p>' +
          '<p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 24px;">' +
            'Your first step: <strong style="color:#ffffff;">log today\'s check-in.</strong> It takes 30 seconds and starts building your performance map.' +
          '</p>' +
          '<div style="text-align:center;">' +
            '<a href="https://peakher.ai/app/" style="display:inline-block;background:#E87461;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Log Your First Check-in</a>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:center;margin-top:32px;">' +
          '<p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0;">PeakHer &copy; 2026 High Performance Ventures LLC.</p>' +
          '<p style="margin:4px 0 0;"><a href="https://peakher.ai/privacy/" style="color:rgba(255,255,255,0.3);font-size:12px;text-decoration:none;">Privacy</a></p>' +
        '</div>' +
      '</div>' +
      '</body></html>'
  };
}

function reminderEmail(name, streak) {
  var streakLine = streak > 0
    ? 'You\'re on a <strong style="color:#2d8a8a;">' + streak + '-day streak</strong>. Keep it going!'
    : 'Start a new streak today. One check-in is all it takes.';

  return {
    subject: streak > 0
      ? name + ', keep your ' + streak + '-day streak alive'
      : name + ', your daily check-in is waiting',
    html: '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
      '<body style="margin:0;padding:0;background:#0a1628;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">' +
      '<div style="max-width:560px;margin:0 auto;padding:40px 24px;">' +
        '<div style="text-align:center;margin-bottom:32px;">' +
          '<span style="font-size:15px;font-weight:800;letter-spacing:4px;color:#2d8a8a;text-transform:uppercase;">PEAKHER</span>' +
        '</div>' +
        '<div style="background:#0f2035;border-radius:12px;padding:32px 24px;border:1px solid rgba(255,255,255,0.06);">' +
          '<h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 12px;">Hey ' + escapeHtml(name) + ',</h1>' +
          '<p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 16px;">' +
            'Quick reminder to log your daily check-in. ' + streakLine +
          '</p>' +
          '<p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 24px;">' +
            'The more data you log, the clearer your performance patterns become.' +
          '</p>' +
          '<div style="text-align:center;">' +
            '<a href="https://peakher.ai/app/" style="display:inline-block;background:#E87461;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Check In Now</a>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:center;margin-top:32px;">' +
          '<p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0;">PeakHer &copy; 2026 High Performance Ventures LLC.</p>' +
          '<p style="margin:4px 0 0;"><a href="https://peakher.ai/privacy/" style="color:rgba(255,255,255,0.3);font-size:12px;text-decoration:none;">Privacy</a></p>' +
        '</div>' +
      '</div>' +
      '</body></html>'
  };
}

function betaInviteEmail(name, spotsLeft) {
  var spotsText = spotsLeft <= 100
    ? 'Only <strong style="color:#2d8a8a;">' + spotsLeft + ' spots</strong> remain'
    : 'Spots are limited';

  return {
    subject: name !== 'there'
      ? '[BETA ACCESS] ' + name + ', your PeakHer invite is ready'
      : '[BETA ACCESS] Your PeakHer invite is ready',
    html: '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
      '<body style="margin:0;padding:0;background:#0a1628;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">' +
      '<div style="max-width:560px;margin:0 auto;padding:40px 24px;">' +
        '<div style="text-align:center;margin-bottom:32px;">' +
          '<span style="font-size:15px;font-weight:800;letter-spacing:4px;color:#2d8a8a;text-transform:uppercase;">PEAKHER</span>' +
          '<span style="display:inline-block;margin-left:10px;padding:3px 10px;border:1px solid #E87461;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:2px;color:#E87461;text-transform:uppercase;vertical-align:middle;">BETA</span>' +
        '</div>' +
        '<div style="background:#0f2035;border-radius:12px;padding:32px 24px;border:1px solid rgba(255,255,255,0.06);">' +
          '<div style="display:inline-block;padding:4px 12px;background:rgba(232,116,97,0.12);border:1px solid rgba(232,116,97,0.4);border-radius:999px;font-size:11px;font-weight:700;letter-spacing:2px;color:#E87461;text-transform:uppercase;margin-bottom:16px;">Founding Beta Tester</div>' +
          '<h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 12px;">You\'re In, ' + escapeHtml(name) + '.</h1>' +
          '<p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 16px;">' +
            'You joined the PeakHer waitlist. We\'re opening the beta to you today.' +
          '</p>' +
          '<p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 16px;">' +
            'PeakHer is the first Hormonal Intelligence platform. Dot reads your biology, your schedule, and your daily check-ins, then tells you exactly what to do today. No guessing. No generic advice. Just your data, translated into decisions.' +
          '</p>' +
          '<div style="background:rgba(232,116,97,0.08);border-left:3px solid #E87461;border-radius:4px;padding:14px 16px;margin:0 0 20px;">' +
            '<p style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 6px;">What BETA means</p>' +
            '<p style="color:#b0b0b0;font-size:14px;line-height:1.6;margin:0;">' +
              'You\'re one of the first people ever to use PeakHer. Core features are live and working. Some edges are still being polished, and new features ship weekly. Your feedback directly shapes what we build next.' +
            '</p>' +
          '</div>' +
          '<p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 24px;">' +
            spotsText + ' in our founding beta. Create your account and log your first check-in (30 seconds).' +
          '</p>' +
          '<div style="text-align:center;">' +
            '<a href="https://peakher.ai/login/?mode=signup" style="display:inline-block;background:#E87461;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Claim Your Beta Access</a>' +
          '</div>' +
          '<p style="color:rgba(255,255,255,0.3);font-size:13px;text-align:center;margin-top:20px;line-height:1.5;">' +
            'You\'re receiving this because you joined the PeakHer waitlist. ' +
            'If you\'re no longer interested, simply ignore this email.' +
          '</p>' +
        '</div>' +
        '<div style="text-align:center;margin-top:32px;">' +
          '<p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0;">PeakHer &copy; 2026 High Performance Ventures LLC. Beta software, provided as-is.</p>' +
          '<p style="margin:4px 0 0;"><a href="https://peakher.ai/privacy/" style="color:rgba(255,255,255,0.3);font-size:12px;text-decoration:none;">Privacy</a></p>' +
        '</div>' +
      '</div>' +
      '</body></html>'
  };
}

/**
 * Reminder email with a mini cycle-phase briefing.
 * Used when the user has cycle tracking enabled.
 *
 * @param {string} name - user's first name
 * @param {number} streak - current streak count
 * @param {{ phase: string, phaseName: string, phaseEmoji: string, miniPhrase: string }} briefing
 */
function briefingReminderEmail(name, streak, briefing) {
  var streakLine = streak > 0
    ? 'You\'re on a <strong style="color:#2d8a8a;">' + streak + '-day streak</strong>. Keep it going!'
    : 'Start a new streak today. One check-in is all it takes.';

  var phaseColors = {
    reflect: '#7BA7C2',
    build: '#5EC49A',
    perform: '#E87461',
    complete: '#C49A5E'
  };
  var phaseColor = phaseColors[briefing.phase] || '#2d8a8a';

  return {
    subject: streak > 0
      ? briefing.phaseEmoji + ' ' + name + ', you\'re in ' + briefing.phaseName + ', keep your ' + streak + '-day streak'
      : briefing.phaseEmoji + ' ' + name + ', you\'re in ' + briefing.phaseName + ' today',
    html: '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
      '<body style="margin:0;padding:0;background:#0a1628;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">' +
      '<div style="max-width:560px;margin:0 auto;padding:40px 24px;">' +
        '<div style="text-align:center;margin-bottom:32px;">' +
          '<span style="font-size:15px;font-weight:800;letter-spacing:4px;color:#2d8a8a;text-transform:uppercase;">PEAKHER</span>' +
        '</div>' +
        '<div style="background:#0f2035;border-radius:12px;padding:32px 24px;border:1px solid rgba(255,255,255,0.06);">' +
          '<h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 12px;">Hey ' + escapeHtml(name) + ',</h1>' +
          '<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:16px;margin:0 0 20px;border-left:3px solid ' + phaseColor + ';">' +
            '<p style="color:#ffffff;font-size:16px;font-weight:600;margin:0 0 6px;">' +
              briefing.phaseEmoji + ' ' + escapeHtml(briefing.phaseName) +
            '</p>' +
            '<p style="color:#b0b0b0;font-size:14px;line-height:1.6;margin:0;">' +
              escapeHtml(briefing.miniPhrase) +
            '</p>' +
          '</div>' +
          '<p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 16px;">' +
            streakLine +
          '</p>' +
          '<p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 24px;">' +
            'Open your daily briefing for full recommendations on work, movement, fuel, and relationships.' +
          '</p>' +
          '<div style="text-align:center;">' +
            '<a href="https://peakher.ai/app/" style="display:inline-block;background:#E87461;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">See Today\'s Briefing</a>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:center;margin-top:32px;">' +
          '<p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0;">PeakHer &copy; 2026 High Performance Ventures LLC.</p>' +
          '<p style="margin:4px 0 0;"><a href="https://peakher.ai/privacy/" style="color:rgba(255,255,255,0.3);font-size:12px;text-decoration:none;">Privacy</a></p>' +
        '</div>' +
      '</div>' +
      '</body></html>'
  };
}

function customEmail(subject, bodyHtml) {
  return {
    subject: subject,
    html: '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
      '<body style="margin:0;padding:0;background:#0a1628;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">' +
      '<div style="max-width:560px;margin:0 auto;padding:40px 24px;">' +
        '<div style="text-align:center;margin-bottom:32px;">' +
          '<span style="font-size:15px;font-weight:800;letter-spacing:4px;color:#2d8a8a;text-transform:uppercase;">PEAKHER</span>' +
        '</div>' +
        '<div style="background:#0f2035;border-radius:12px;padding:32px 24px;border:1px solid rgba(255,255,255,0.06);">' +
          bodyHtml +
        '</div>' +
        '<div style="text-align:center;margin-top:32px;">' +
          '<p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0;">PeakHer &copy; 2026 High Performance Ventures LLC.</p>' +
          '<p style="margin:4px 0 0;"><a href="https://peakher.ai/privacy/" style="color:rgba(255,255,255,0.3);font-size:12px;text-decoration:none;">Privacy</a></p>' +
        '</div>' +
      '</div>' +
      '</body></html>'
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  sendEmail: sendEmail,
  welcomeEmail: welcomeEmail,
  reminderEmail: reminderEmail,
  briefingReminderEmail: briefingReminderEmail,
  betaInviteEmail: betaInviteEmail,
  customEmail: customEmail,
  escapeHtml: escapeHtml
};
