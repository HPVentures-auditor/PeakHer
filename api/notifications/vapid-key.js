module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      publicKey: process.env.VAPID_PUBLIC_KEY || ''
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
