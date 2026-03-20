const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  try {
    var sql = getDb();

    var rows = await sql`
      SELECT plan, status, current_period_end, cancel_at_period_end, founding_member,
             stripe_subscription_id
      FROM subscriptions WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      return res.status(200).json({
        plan: 'free',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        foundingMember: false,
        trialEnd: null
      });
    }

    var sub = rows[0];

    // Check if currently in trial by looking at Stripe subscription
    var trialEnd = null;
    if (sub.stripe_subscription_id && sub.status === 'trialing') {
      try {
        var { getStripe } = require('../_lib/stripe');
        var stripe = getStripe();
        var stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        if (stripeSub.trial_end) {
          trialEnd = new Date(stripeSub.trial_end * 1000).toISOString();
        }
      } catch (stripeErr) {
        console.error('Stripe trial lookup error:', stripeErr.message);
        // Non-fatal, just return null trialEnd
      }
    }

    return res.status(200).json({
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end).toISOString() : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end || false,
      foundingMember: sub.founding_member || false,
      trialEnd: trialEnd
    });
  } catch (err) {
    console.error('Billing status GET error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
