/**
 * PeakHer Twilio SMS Module
 *
 * Thin wrapper around the Twilio SDK for sending SMS messages.
 * Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

var twilioClient = null;

function getConfig() {
  var accountSid = process.env.TWILIO_ACCOUNT_SID;
  var authToken = process.env.TWILIO_AUTH_TOKEN;
  var phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) {
    return null;
  }
  return { accountSid: accountSid, authToken: authToken, phoneNumber: phoneNumber };
}

function getClient() {
  if (twilioClient) return twilioClient;
  var config = getConfig();
  if (!config) return null;
  var twilio = require('twilio');
  twilioClient = twilio(config.accountSid, config.authToken);
  return twilioClient;
}

/**
 * Send an SMS message.
 * @param {string} to - E.164 format phone number (e.g. +15551234567)
 * @param {string} body - Message text (max 1600 chars for long SMS)
 * @returns {Promise<{sid: string, status: string} | {skipped: true}>}
 */
async function sendSMS(to, body) {
  var client = getClient();
  if (!client) {
    console.warn('PeakHer Twilio: credentials not configured, skipping SMS');
    return { skipped: true };
  }

  var config = getConfig();
  var message = await client.messages.create({
    body: body,
    from: config.phoneNumber,
    to: to
  });

  return { sid: message.sid, status: message.status };
}

/**
 * Validate Twilio webhook signature for incoming messages.
 * @param {string} twilioSignature - X-Twilio-Signature header
 * @param {string} url - The full webhook URL
 * @param {Object} params - The POST body params
 * @returns {boolean}
 */
function validateWebhook(twilioSignature, url, params) {
  var config = getConfig();
  if (!config) return false;

  var twilio = require('twilio');
  return twilio.validateRequest(
    config.authToken,
    twilioSignature,
    url,
    params
  );
}

/**
 * Generate a TwiML response string.
 * @param {string} message - The reply message text
 * @returns {string} TwiML XML
 */
function twimlResponse(message) {
  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Response><Message>' + escapeXml(message) + '</Message></Response>';
}

/**
 * Generate an empty TwiML response (no reply).
 * @returns {string} TwiML XML
 */
function twimlEmpty() {
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
}

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  sendSMS: sendSMS,
  validateWebhook: validateWebhook,
  twimlResponse: twimlResponse,
  twimlEmpty: twimlEmpty,
  getConfig: getConfig
};
