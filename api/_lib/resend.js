/**
 * PeakHer Resend Email Module
 *
 * Sends rich HTML emails (daily briefs) via Resend API.
 * Requires RESEND_API_KEY env var.
 */

var RESEND_URL = 'https://api.resend.com/emails';

async function sendEmail(options) {
  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.warn('RESEND_API_KEY not set'); return { skipped: true }; }
  var from = options.from || 'Dot from PeakHer <dot@peakher.ai>';
  var resp = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: from, to: Array.isArray(options.to) ? options.to : [options.to], subject: options.subject, html: options.html })
  });
  if (!resp.ok) { var err = await resp.text(); console.error('Email send error:', err); return { error: err }; }
  return { sent: true, data: await resp.json() };
}

module.exports = { sendEmail: sendEmail };
