const Stripe = require('stripe');

var stripeInstance = null;

function getStripe() {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });
  }
  return stripeInstance;
}

async function getCustomerByEmail(email) {
  var stripe = getStripe();
  var customers = await stripe.customers.list({ email: email, limit: 1 });
  return customers.data.length > 0 ? customers.data[0] : null;
}

async function createCheckoutSession(userId, email, priceId, successUrl, cancelUrl) {
  var stripe = getStripe();

  // Find or create customer
  var customer = await getCustomerByEmail(email);
  if (!customer) {
    customer = await stripe.customers.create({
      email: email,
      metadata: { userId: userId }
    });
  }

  var session = await stripe.checkout.sessions.create({
    customer: customer.id,
    client_reference_id: userId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId: userId, plan: 'premium' }
    },
    metadata: { userId: userId, plan: 'premium' },
    success_url: successUrl,
    cancel_url: cancelUrl
  });

  return session;
}

async function getSubscription(subscriptionId) {
  var stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

async function cancelSubscription(subscriptionId) {
  var stripe = getStripe();
  return stripe.subscriptions.cancel(subscriptionId);
}

module.exports = {
  getStripe: getStripe,
  getCustomerByEmail: getCustomerByEmail,
  createCheckoutSession: createCheckoutSession,
  getSubscription: getSubscription,
  cancelSubscription: cancelSubscription
};
