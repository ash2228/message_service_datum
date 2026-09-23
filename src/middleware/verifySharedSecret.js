const crypto = require('crypto');
const config = require('../config');

function safeEquals(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifySharedSecret(req, res, next) {
  const provided = req.header('x-shared-secret');

  if (!config.sharedSecret) {
    return res.status(500).json({ error: 'SHARED_SECRET is not configured on this service' });
  }

  if (!provided || !safeEquals(provided, config.sharedSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = verifySharedSecret;
