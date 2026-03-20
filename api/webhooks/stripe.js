const { getDb } = require('../_lib/db');
const { getStripe } = require('../_lib/stripe');

// Disable Vercel body parsing so we can read raw body for signature verification
module.exports.config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (chunk) { chunks.push(chunk); });
    req.on('end', function () { resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var stripe = getStripe();
  var webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  var rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error('Failed to read raw body:', err.message);
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  var sig = req.headers['stripe-signature'];
  var event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  var sql = getDb();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(sql, stripe, event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(sql, event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(sql, event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(sql, event.data.object);
        break;

      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error for ' + event.type + ':', err.message);
    return res.status(500).json({ error: 'Webhook handler error' });
  }
};

async function handleCheckoutCompleted(sql, stripe, session) {
  var userId = session.client_reference_id || (session.metadata && session.metadata.userId);
  var customerId = session.customer;
  var subscriptionId = session.subscription;

  if (!userId) {
    console.error('checkout.session.completed: no userId found in session', session.id);
    return;
  }

  // Retrieve the subscription to get price and period details
  var subscription = await stripe.subscriptions.retrieve(subscriptionId);
  var priceId = subscription.items.data[0].price.id;

  // Check founding member status from subscription metadata or price metadata
  var isFoundingMember = false;
  if (subscription.metadata && subscription.metadata.founding === 'true') {
    isFoundingMember = true;
  }
  if (!isFoundingMember) {
    var price = await stripe.prices.retrieve(priceId);
    if (price.metadata && price.metadata.founding === 'true') {
      isFoundingMember = true;
    }
  }

  var status = subscription.status;
  var periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : null;
  var periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  // Upsert subscription record
  await sql`
    INSERT INTO subscriptions (
      user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
      plan, status, current_period_start, current_period_end,
      cancel_at_period_end, founding_member, updated_at
    ) VALUES (
      ${userId}, ${customerId}, ${subscriptionId}, ${priceId},
      'premium', ${status}, ${periodStart}, ${periodEnd},
      false, ${isFoundingMember}, now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      stripe_price_id = EXCLUDED.stripe_price_id,
      plan = 'premium',
      status = EXCLUDED.status,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = false,
      founding_member = EXCLUDED.founding_member,
      updated_at = now()
  `;

  // Update user plan
  await sql`UPDATE users SET plan = 'premium' WHERE id = ${userId}`;

  console.log('checkout.session.completed: user=' + userId + ' sub=' + subscriptionId + ' plan=premium founding=' + isFoundingMember);
}

async function handleSubscriptionUpdated(sql, subscription) {
  var subscriptionId = subscription.id;
  var status = subscription.status;
  var cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
  var periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : null;
  var periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  var priceId = subscription.items.data[0].price.id;

  // Update the subscription record
  var result = await sql`
    UPDATE subscriptions SET
      status = ${status},
      stripe_price_id = ${priceId},
      current_period_start = ${periodStart},
      current_period_end = ${periodEnd},
      cancel_at_period_end = ${cancelAtPeriodEnd},
      updated_at = now()
    WHERE stripe_subscription_id = ${subscriptionId}
    RETURNING user_id
  `;

  if (result.length > 0) {
    // If subscription went to active from trialing or other, ensure user plan stays premium
    if (status === 'active' || status === 'trialing') {
      await sql`UPDATE users SET plan = 'premium' WHERE id = ${result[0].user_id}`;
    }
    console.log('customer.subscription.updated: sub=' + subscriptionId + ' status=' + status);
  } else {
    console.log('customer.subscription.updated: no matching subscription for ' + subscriptionId);
  }
}

async function handleSubscriptionDeleted(sql, subscription) {
  var subscriptionId = subscription.id;

  var result = await sql`
    UPDATE subscriptions SET
      plan = 'free',
      status = 'canceled',
      cancel_at_period_end = false,
      updated_at = now()
    WHERE stripe_subscription_id = ${subscriptionId}
    RETURNING user_id
  `;

  if (result.length > 0) {
    await sql`UPDATE users SET plan = 'free' WHERE id = ${result[0].user_id}`;
    console.log('customer.subscription.deleted: user=' + result[0].user_id + ' sub=' + subscriptionId + ' -> free');
  } else {
    console.log('customer.subscription.deleted: no matching subscription for ' + subscriptionId);
  }
}

async function handlePaymentFailed(sql, invoice) {
  var subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    console.log('invoice.payment_failed: no subscription on invoice ' + invoice.id);
    return;
  }

  var result = await sql`
    UPDATE subscriptions SET
      status = 'past_due',
      updated_at = now()
    WHERE stripe_subscription_id = ${subscriptionId}
    RETURNING user_id
  `;

  if (result.length > 0) {
    console.log('invoice.payment_failed: user=' + result[0].user_id + ' sub=' + subscriptionId + ' -> past_due');
  } else {
    console.log('invoice.payment_failed: no matching subscription for ' + subscriptionId);
  }
}
