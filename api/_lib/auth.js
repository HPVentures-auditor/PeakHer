const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '7d';

function createToken(userId) {
  return jwt.sign({ userId: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function getUserId(req) {
  var auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  var decoded = verifyToken(auth.slice(7));
  return decoded ? decoded.userId : null;
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

module.exports = { createToken, verifyToken, getUserId, sendError };
