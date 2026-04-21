const { requireAdmin } = require('../_lib/admin');
const { sendError } = require('../_lib/auth');
const { logActivity } = require('../_lib/activity');
const { getStripe } = require('../_lib/stripe');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  var ctx = await requireAdmin(req, res);
  if (!ctx) return;
  var sql = ctx.sql;

  var userId = req.query.id;
  if (!userId) return sendError(res, 400, 'User ID required');

  // Look up the user's subscription row
  var subRows = await sql`
    SELECT s.id, s.stripe_customer_id, s.stripe_subscription_id, s.plan, s.status,
           s.current_period_end, s.cancel_at_period_end, s.founding_member,
           u.email, u.name
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    WHERE s.user_id = ${userId}
  `;

  if (req.method === 'GET') {
    try {
      if (!subRows.length) {
        // No subscription row at all — user is free-tier, never paid
        var userRows = await sql`SELECT email, name, plan FROM users WHERE id = ${userId}`;
        if (!userRows.length) return sendError(res, 404, 'User not found');
        return res.status(200).json({
          hasSubscription: false,
          plan: userRows[0].plan || 'free',
          email: userRows[0].email,
          stripe: null
        });
      }

      var sub = subRows[0];
      var stripeState = null;

      // Fetch live Stripe state if we have a subscription id
      if (sub.stripe_subscription_id) {
        try {
          var stripe = getStripe();
          var stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
          stripeState = {
            id: stripeSub.id,
            status: stripeSub.status,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end || false,
            currentPeriodEnd: stripeSub.current_period_end
              ? new Date(stripeSub.current_period_end * 1000).toISOString()
              : null,
            trialEnd: stripeSub.trial_end
              ? new Date(stripeSub.trial_end * 1000).toISOString()
              : null,
            pauseCollection: stripeSub.pause_collection || null,
            canceledAt: stripeSub.canceled_at
              ? new Date(stripeSub.canceled_at * 1000).toISOString()
              : null
          };
        } catch (stripeErr) {
          console.error('Admin subscription Stripe fetch error:', stripeErr.message);
          // Fall through with stripeState = null; caller sees DB state only
        }
      }

      return res.status(200).json({
        hasSubscription: true,
        plan: sub.plan,
        status: sub.status,
        stripeCustomerId: sub.stripe_customer_id,
        stripeSubscriptionId: sub.stripe_subscription_id,
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end).toISOString() : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end || false,
        foundingMember: sub.founding_member || false,
        email: sub.email,
        stripe: stripeState
      });
    } catch (err) {
      console.error('Admin subscription GET error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  if (req.method === 'POST') {
    try {
      var action = req.body && req.body.action;
      if (!action) return sendError(res, 400, 'action is required');

      if (!subRows.length || !subRows[0].stripe_subscription_id) {
        return sendError(res, 404, 'No Stripe subscription found for this user');
      }

      var sub0 = subRows[0];
      var stripe0 = getStripe();
      var subscriptionId = sub0.stripe_subscription_id;
      var targetLabel = sub0.email;

      if (action === 'cancel_now') {
        // Immediate cancel. Webhook customer.subscription.deleted will reconcile DB.
        await stripe0.subscriptions.cancel(subscriptionId);
        // Write-through in case webhook is delayed (UI refresh needs current state).
        await sql`
          UPDATE subscriptions SET plan = 'free', status = 'canceled',
                 cancel_at_period_end = false, updated_at = now()
          WHERE user_id = ${userId}
        `;
        await sql`UPDATE users SET plan = 'free' WHERE id = ${userId}`;
        logActivity(sql, ctx.userId, {
          action: 'cancel_subscription_now',
          targetType: 'subscription',
          targetId: subscriptionId,
          targetLabel: targetLabel,
          details: 'Immediate cancellation via admin panel'
        });
        return res.status(200).json({ success: true, message: 'Subscription cancelled immediately' });
      }

      if (action === 'cancel_at_period_end') {
        await stripe0.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
        await sql`
          UPDATE subscriptions SET cancel_at_period_end = true, updated_at = now()
          WHERE user_id = ${userId}
        `;
        logActivity(sql, ctx.userId, {
          action: 'cancel_subscription_period_end',
          targetType: 'subscription',
          targetId: subscriptionId,
          targetLabel: targetLabel,
          details: 'Will cancel at end of current period'
        });
        return res.status(200).json({ success: true, message: 'Subscription will cancel at period end' });
      }

      if (action === 'pause') {
        // Pause collection = stop charging but keep the subscription. "void" = no invoices generated.
        await stripe0.subscriptions.update(subscriptionId, {
          pause_collection: { behavior: 'void' }
        });
        await sql`
          UPDATE subscriptions SET status = 'paused', updated_at = now()
          WHERE user_id = ${userId}
        `;
        logActivity(sql, ctx.userId, {
          action: 'pause_subscription',
          targetType: 'subscription',
          targetId: subscriptionId,
          targetLabel: targetLabel,
          details: 'Paused collection via admin panel'
        });
        return res.status(200).json({ success: true, message: 'Subscription paused' });
      }

      if (action === 'resume') {
        // Clear both pause_collection and cancel_at_period_end so the sub is fully active again.
        await stripe0.subscriptions.update(subscriptionId, {
          pause_collection: '',
          cancel_at_period_end: false
        });
        // Pull fresh status from Stripe after the update
        var fresh = await stripe0.subscriptions.retrieve(subscriptionId);
        await sql`
          UPDATE subscriptions SET status = ${fresh.status}, cancel_at_period_end = false,
                 updated_at = now()
          WHERE user_id = ${userId}
        `;
        if (fresh.status === 'active' || fresh.status === 'trialing') {
          await sql`UPDATE users SET plan = 'premium' WHERE id = ${userId}`;
        }
        logActivity(sql, ctx.userId, {
          action: 'resume_subscription',
          targetType: 'subscription',
          targetId: subscriptionId,
          targetLabel: targetLabel,
          details: 'Resumed via admin panel'
        });
        return res.status(200).json({ success: true, message: 'Subscription resumed' });
      }

      return sendError(res, 400, 'Unknown action: ' + action);
    } catch (err) {
      console.error('Admin subscription POST error:', err.message);
      // Stripe errors often carry useful messages — surface them to the admin UI.
      return sendError(res, 500, 'Stripe error: ' + err.message);
    }
  }

  return sendError(res, 405, 'Method not allowed');
};
