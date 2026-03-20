const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');
const { getStripe, getCustomerByEmail } = require('../_lib/stripe');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  try {
    var sql = getDb();
    var priceId = req.body && req.body.priceId;

    if (!priceId || typeof priceId !== 'string') {
      return sendError(res, 400, 'priceId is required');
    }

    // Get user email
    var rows = await sql`SELECT email FROM users WHERE id = ${userId}`;
    if (rows.length === 0) return sendError(res, 404, 'User not found');
    var email = rows[0].email;

    // Find or create Stripe customer
    var stripe = getStripe();
    var customer = await getCustomerByEmail(email);
    if (!customer) {
      customer = await stripe.customers.create({
        email: email,
        metadata: { userId: userId }
      });
    }

    // Determine if this is a founding member price by checking price metadata
    var priceObj = await stripe.prices.retrieve(priceId);
    var isFoundingMember = priceObj.metadata && priceObj.metadata.founding === 'true';

    // Create Checkout Session
    var session = await stripe.checkout.sessions.create({
      customer: customer.id,
      client_reference_id: userId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: userId,
          plan: 'premium',
          founding: isFoundingMember ? 'true' : 'false'
        }
      },
      metadata: {
        userId: userId,
        plan: 'premium',
        founding: isFoundingMember ? 'true' : 'false'
      },
      success_url: 'https://peakher.ai/app/#checkin?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://peakher.ai/pricing/'
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout POST error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
