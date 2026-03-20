const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');
const { getStripe } = require('../_lib/stripe');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  try {
    var sql = getDb();

    // Look up user's stripe_customer_id from subscriptions table
    var rows = await sql`
      SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${userId}
    `;

    if (rows.length === 0 || !rows[0].stripe_customer_id) {
      return sendError(res, 400, 'No billing account found. Please subscribe first.');
    }

    var stripeCustomerId = rows[0].stripe_customer_id;
    var stripe = getStripe();

    // Create a Billing Portal Session
    var session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: 'https://peakher.ai/app/'
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Portal POST error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
