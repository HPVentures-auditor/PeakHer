var { getUserId, sendError, createToken } = require('../_lib/auth');
var { getAuthUrl } = require('../_lib/google-calendar');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  try {
    // Sign the userId into a JWT so the callback can verify it
    // Include source (native/web) so callback knows where to redirect
    var source = req.query.source || 'web';
    var statePayload = { userId: userId, source: source };
    var state = require('jsonwebtoken').sign(statePayload, process.env.JWT_SECRET, { expiresIn: '10m' });
    var url = getAuthUrl(state);

    return res.status(200).json({ url: url });
  } catch (err) {
    console.error('Calendar auth error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
