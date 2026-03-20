/**
 * PeakHer Push Notification Module — web-push integration
 *
 * Requires env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *
 * VAPID_SUBJECT should be a mailto: URL, e.g. "mailto:hello@peakher.ai"
 */

var webpush = require('web-push');

var vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
var vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
var vapidSubject = process.env.VAPID_SUBJECT || 'mailto:hello@peakher.ai';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Send a push notification to a single subscription.
 * @param {{ endpoint: string, keys: { p256dh: string, auth: string } }} subscription
 * @param {{ title: string, body: string, url?: string, icon?: string }} payload
 * @returns {Promise<object>} web-push send result
 */
async function sendPushNotification(subscription, payload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('PeakHer Push: VAPID keys not configured, skipping push');
    return { skipped: true };
  }

  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

/**
 * Send a push notification to all of a user's subscriptions.
 * Automatically cleans up expired/unsubscribed endpoints (410, 404).
 *
 * @param {function} sql — Neon SQL tagged template function
 * @param {string} userId
 * @param {{ title: string, body: string, url?: string, icon?: string }} payload
 * @returns {Promise<{ sent: number, failed: number, cleaned: number }>}
 */
async function sendPushToUser(sql, userId, payload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('PeakHer Push: VAPID keys not configured, skipping push');
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  var subscriptions = await sql`
    SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}
  `;

  var sent = 0;
  var failed = 0;
  var cleaned = 0;

  for (var i = 0; i < subscriptions.length; i++) {
    var sub = subscriptions[i];
    var pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      await sendPushNotification(pushSub, payload);
      sent++;
    } catch (err) {
      failed++;
      // Clean up expired or unsubscribed endpoints
      if (err.statusCode === 410 || err.statusCode === 404) {
        try {
          await sql`DELETE FROM push_subscriptions WHERE id = ${sub.id}`;
          cleaned++;
        } catch (delErr) {
          console.error('PeakHer Push: failed to clean up subscription', sub.id, delErr.message);
        }
      } else {
        console.error('PeakHer Push: send failed for subscription', sub.id, err.statusCode || err.message);
      }
    }
  }

  return { sent: sent, failed: failed, cleaned: cleaned };
}

module.exports = {
  sendPushNotification: sendPushNotification,
  sendPushToUser: sendPushToUser
};
