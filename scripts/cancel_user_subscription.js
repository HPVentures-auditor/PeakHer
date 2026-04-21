/**
 * One-off: cancel a user's Stripe subscription immediately by email.
 *
 * Usage:
 *   node scripts/cancel_user_subscription.js <email>
 *
 * Reads STRIPE_SECRET_KEY + DATABASE_URL from .env.local (or process.env).
 *
 * What it does:
 *   1. Look up user + subscription by email in Neon
 *   2. Call stripe.subscriptions.cancel(id) — immediate, no proration
 *   3. Update local DB so the admin panel reflects the new state without
 *      waiting for the webhook
 *
 * Exits 0 on success, non-zero on any failure.
 */

var fs = require('fs');
var path = require('path');

// Load env vars from .env.local (same pattern as migrate_subscriptions.js)
var envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  var lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(function (line) {
    var match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      var val = match[2].trim();
      if ((val[0] === '"' && val[val.length - 1] === '"') || (val[0] === "'" && val[val.length - 1] === "'")) {
        val = val.slice(1, -1);
      }
      process.env[match[1].trim()] = val;
    }
  });
}

var email = (process.argv[2] || '').toLowerCase().trim();
if (!email || email.indexOf('@') === -1) {
  console.error('Usage: node scripts/cancel_user_subscription.js <email>');
  process.exit(2);
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set. Check .env.local');
  process.exit(1);
}
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('ERROR: STRIPE_SECRET_KEY not set. Check .env.local');
  process.exit(1);
}

var { neon } = require('@neondatabase/serverless');
var Stripe = require('stripe');

var sql = neon(process.env.DATABASE_URL);
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

async function run() {
  console.log('\nLooking up user:', email);

  var userRows = await sql`SELECT id, name, email FROM users WHERE lower(email) = ${email}`;
  if (!userRows.length) {
    console.error('No user found with email: ' + email);
    process.exit(3);
  }
  var user = userRows[0];
  console.log('  Found user: ' + user.name + ' (' + user.id + ')');

  var subRows = await sql`
    SELECT stripe_customer_id, stripe_subscription_id, status, plan, current_period_end
    FROM subscriptions WHERE user_id = ${user.id}
  `;

  if (!subRows.length) {
    console.log('\nNo subscription row in DB for this user.');
    console.log('Searching Stripe directly by email...');

    var customers = await stripe.customers.list({ email: user.email, limit: 5 });
    if (!customers.data.length) {
      console.log('No Stripe customer found either. User has no active billing.');
      process.exit(0);
    }
    // Check each customer for active subs
    var anyCancelled = false;
    for (var i = 0; i < customers.data.length; i++) {
      var cust = customers.data[i];
      var subs = await stripe.subscriptions.list({ customer: cust.id, status: 'all', limit: 10 });
      for (var j = 0; j < subs.data.length; j++) {
        var s = subs.data[j];
        if (s.status === 'canceled') continue;
        console.log('  Cancelling Stripe sub ' + s.id + ' (status=' + s.status + ')');
        await stripe.subscriptions.cancel(s.id);
        anyCancelled = true;
      }
    }
    if (anyCancelled) {
      console.log('\nDone. Webhook will reconcile DB.');
    } else {
      console.log('\nNo active subscriptions found in Stripe for this email.');
    }
    process.exit(0);
  }

  var sub = subRows[0];
  console.log('  DB subscription: status=' + sub.status + ' plan=' + sub.plan);
  console.log('  Stripe sub id:  ' + sub.stripe_subscription_id);

  if (!sub.stripe_subscription_id) {
    console.log('\nNo Stripe subscription ID on record. Nothing to cancel in Stripe.');
    await sql`UPDATE subscriptions SET status = 'canceled', plan = 'free', updated_at = now() WHERE user_id = ${user.id}`;
    await sql`UPDATE users SET plan = 'free' WHERE id = ${user.id}`;
    console.log('Marked DB record as cancelled/free.');
    process.exit(0);
  }

  console.log('\nCancelling subscription in Stripe (immediate, no proration)...');
  var cancelled = await stripe.subscriptions.cancel(sub.stripe_subscription_id);
  console.log('  Stripe status: ' + cancelled.status + ' (canceled_at=' + (cancelled.canceled_at ? new Date(cancelled.canceled_at * 1000).toISOString() : 'n/a') + ')');

  console.log('\nUpdating local DB...');
  await sql`
    UPDATE subscriptions SET plan = 'free', status = 'canceled',
           cancel_at_period_end = false, updated_at = now()
    WHERE user_id = ${user.id}
  `;
  await sql`UPDATE users SET plan = 'free' WHERE id = ${user.id}`;

  console.log('\nCancellation complete for ' + user.email);
  console.log('No further charges will be attempted.\n');
}

run().catch(function (err) {
  console.error('\nScript failed:', err.message);
  process.exit(1);
});
