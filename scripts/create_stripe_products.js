/**
 * Create PeakHer Stripe products and prices.
 * Usage: node scripts/create_stripe_products.js
 *
 * Requires STRIPE_SECRET_KEY env var (reads from .env.local automatically).
 * Idempotent: checks if products already exist before creating.
 */

// Load env vars from .env.local
var fs = require('fs');
var path = require('path');
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

var Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('ERROR: STRIPE_SECRET_KEY not set. Check .env.local');
  process.exit(1);
}

var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

async function findProductByMetadata(appName) {
  var products = await stripe.products.list({ limit: 100, active: true });
  for (var i = 0; i < products.data.length; i++) {
    var p = products.data[i];
    if (p.metadata && p.metadata.app === 'peakher' && p.metadata.tier === appName) {
      return p;
    }
  }
  return null;
}

async function findPriceByMetadata(productId, interval, priceType) {
  var prices = await stripe.prices.list({ product: productId, limit: 100, active: true });
  for (var i = 0; i < prices.data.length; i++) {
    var p = prices.data[i];
    if (p.recurring && p.recurring.interval === interval && p.metadata && p.metadata.type === priceType) {
      return p;
    }
  }
  return null;
}

async function run() {
  console.log('Creating PeakHer Stripe products and prices...\n');

  // =============================================
  // Product 1: PeakHer Premium
  // =============================================
  var premiumProduct = await findProductByMetadata('premium');
  if (premiumProduct) {
    console.log('  ~ PeakHer Premium product already exists: ' + premiumProduct.id);
  } else {
    premiumProduct = await stripe.products.create({
      name: 'PeakHer Premium',
      description: 'Personal performance intelligence for women who lead. Daily check-ins, AI-powered insights, cycle-aware recommendations, and more.',
      metadata: { app: 'peakher', tier: 'premium' }
    });
    console.log('  + Created PeakHer Premium product: ' + premiumProduct.id);
  }

  // Monthly Founding Member: $9.99/month
  var monthlyFoundingPrice = await findPriceByMetadata(premiumProduct.id, 'month', 'founding');
  if (monthlyFoundingPrice) {
    console.log('  ~ Monthly Founding Member price already exists: ' + monthlyFoundingPrice.id);
  } else {
    monthlyFoundingPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 999,
      currency: 'usd',
      recurring: { interval: 'month' },
      nickname: 'PeakHer Premium Monthly - Founding Member',
      metadata: { type: 'founding', founding: 'true', app: 'peakher' }
    });
    console.log('  + Created Monthly Founding Member price: ' + monthlyFoundingPrice.id + ' ($9.99/mo)');
  }

  // Monthly Regular: $14.99/month
  var monthlyRegularPrice = await findPriceByMetadata(premiumProduct.id, 'month', 'regular');
  if (monthlyRegularPrice) {
    console.log('  ~ Monthly Regular price already exists: ' + monthlyRegularPrice.id);
  } else {
    monthlyRegularPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 1499,
      currency: 'usd',
      recurring: { interval: 'month' },
      nickname: 'PeakHer Premium Monthly - Regular',
      metadata: { type: 'regular', founding: 'false', app: 'peakher' }
    });
    console.log('  + Created Monthly Regular price: ' + monthlyRegularPrice.id + ' ($14.99/mo)');
  }

  // Annual Founding Member: $99.99/year
  var annualFoundingPrice = await findPriceByMetadata(premiumProduct.id, 'year', 'founding');
  if (annualFoundingPrice) {
    console.log('  ~ Annual Founding Member price already exists: ' + annualFoundingPrice.id);
  } else {
    annualFoundingPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 9999,
      currency: 'usd',
      recurring: { interval: 'year' },
      nickname: 'PeakHer Premium Annual - Founding Member',
      metadata: { type: 'founding', founding: 'true', app: 'peakher' }
    });
    console.log('  + Created Annual Founding Member price: ' + annualFoundingPrice.id + ' ($99.99/yr)');
  }

  // Annual Regular: $149.99/year
  var annualRegularPrice = await findPriceByMetadata(premiumProduct.id, 'year', 'regular');
  if (annualRegularPrice) {
    console.log('  ~ Annual Regular price already exists: ' + annualRegularPrice.id);
  } else {
    annualRegularPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 14999,
      currency: 'usd',
      recurring: { interval: 'year' },
      nickname: 'PeakHer Premium Annual - Regular',
      metadata: { type: 'regular', founding: 'false', app: 'peakher' }
    });
    console.log('  + Created Annual Regular price: ' + annualRegularPrice.id + ' ($149.99/yr)');
  }

  // =============================================
  // Product 2: PeakHer Teams
  // =============================================
  var teamsProduct = await findProductByMetadata('teams');
  if (teamsProduct) {
    console.log('  ~ PeakHer Teams product already exists: ' + teamsProduct.id);
  } else {
    teamsProduct = await stripe.products.create({
      name: 'PeakHer Teams',
      description: 'PeakHer for teams. Performance intelligence for your entire organization.',
      metadata: { app: 'peakher', tier: 'teams' }
    });
    console.log('  + Created PeakHer Teams product: ' + teamsProduct.id);
  }

  // Teams Monthly: $19.99/user/month
  var teamsMonthlyPrice = await findPriceByMetadata(teamsProduct.id, 'month', 'regular');
  if (teamsMonthlyPrice) {
    console.log('  ~ Teams Monthly price already exists: ' + teamsMonthlyPrice.id);
  } else {
    teamsMonthlyPrice = await stripe.prices.create({
      product: teamsProduct.id,
      unit_amount: 1999,
      currency: 'usd',
      recurring: { interval: 'month' },
      nickname: 'PeakHer Teams Monthly - Per User',
      metadata: { type: 'regular', founding: 'false', app: 'peakher' }
    });
    console.log('  + Created Teams Monthly price: ' + teamsMonthlyPrice.id + ' ($19.99/user/mo)');
  }

  // =============================================
  // Summary
  // =============================================
  console.log('\n========================================');
  console.log('STRIPE PRICE IDS (save these for your app config):');
  console.log('========================================');
  console.log('PeakHer Premium (' + premiumProduct.id + '):');
  console.log('  Monthly Founding Member: ' + monthlyFoundingPrice.id + '  ($9.99/mo)');
  console.log('  Monthly Regular:         ' + monthlyRegularPrice.id + '  ($14.99/mo)');
  console.log('  Annual Founding Member:  ' + annualFoundingPrice.id + '  ($99.99/yr)');
  console.log('  Annual Regular:          ' + annualRegularPrice.id + '  ($149.99/yr)');
  console.log('');
  console.log('PeakHer Teams (' + teamsProduct.id + '):');
  console.log('  Monthly Per User:        ' + teamsMonthlyPrice.id + '  ($19.99/user/mo)');
  console.log('========================================\n');
}

run().catch(function (err) {
  console.error('Script failed:', err.message);
  process.exit(1);
});
