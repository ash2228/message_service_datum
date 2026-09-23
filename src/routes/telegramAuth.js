const express = require('express');
const crypto = require('crypto');
const verifySharedSecret = require('../middleware/verifySharedSecret');
const PendingTelegramLink = require('../models/PendingTelegramLink');
const { getBotUsername } = require('../services/telegramService');

const router = express.Router();

router.get('/auth/telegram', verifySharedSecret, async (req, res) => {
  const { username } = req.query;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'username query param is required' });
  }

  // Telegram's /start payload only allows [A-Za-z0-9_-], up to 64 chars — a
  // short random token, not the username itself, keeps this safe and simple.
  const token = crypto.randomBytes(18).toString('base64url');

  // One pending link per username: a fresh request invalidates any older,
  // unused link for that same username.
  await PendingTelegramLink.findOneAndUpdate(
    { username },
    { token, username, createdAt: new Date() },
    { upsert: true }
  );

  const botUsername = await getBotUsername();
  return res.redirect(`https://t.me/${botUsername}?start=${token}`);
});

module.exports = router;
