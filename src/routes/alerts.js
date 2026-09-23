const express = require('express');
const verifySharedSecret = require('../middleware/verifySharedSecret');
const telegramService = require('../services/telegramService');
const User = require('../models/User');

const router = express.Router();

const SUPPORTED_DRAINS = new Set(['TELEGRAM']);

function parseDrains(header) {
  if (!header) return [];
  return header
    .split(',')
    .map((drain) => drain.trim().toUpperCase())
    .filter(Boolean);
}

function formatAlertMessage(alert) {
  const lines = [];
  if (alert.severity) lines.push(`[${String(alert.severity).toUpperCase()}]`);
  if (alert.title) lines.push(alert.title);
  if (alert.message) lines.push(alert.message);
  return lines.join(' ').trim();
}

/**
 * Each entry in body.users may name a `telegramChatId` directly, or just a
 * `username` to be looked up in the `users` collection (populated by the
 * /auth/telegram link flow). Entries with no resolvable chat id are reported
 * back as failures rather than dropped silently.
 */
async function resolveChatIds(users) {
  const usernames = users.filter((user) => !user.telegramChatId && user.username).map((user) => user.username);

  let chatIdByUsername = {};
  if (usernames.length > 0) {
    const docs = await User.find({ username: { $in: usernames } }).lean();
    chatIdByUsername = Object.fromEntries(docs.map((doc) => [doc.username, doc.chatId]));
  }

  return users.map((user) => ({
    telegramChatId: user.telegramChatId || chatIdByUsername[user.username] || null,
    username: user.username,
  }));
}

router.post('/alerts', verifySharedSecret, async (req, res) => {
  const drains = parseDrains(req.header('x-drains'));

  if (drains.length === 0) {
    return res.status(400).json({ error: 'x-drains header is required' });
  }

  const { alert, users } = req.body || {};

  if (!alert || (!alert.message && !alert.title)) {
    return res.status(400).json({ error: 'body.alert with a title or message is required' });
  }

  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: 'body.users must be a non-empty array' });
  }

  const invalidUser = users.find((user) => !user || (!user.telegramChatId && !user.username));
  if (invalidUser) {
    return res.status(400).json({ error: 'every entry in body.users requires a telegramChatId or a username' });
  }

  if (!drains.includes('TELEGRAM')) {
    return res.status(200).json({ processed: [], skipped: drains.filter((d) => !SUPPORTED_DRAINS.has(d)) });
  }

  try {
    const resolvedUsers = await resolveChatIds(users);
    const sendable = resolvedUsers.filter((user) => user.telegramChatId);
    const unresolved = resolvedUsers
      .filter((user) => !user.telegramChatId)
      .map((user) => ({ username: user.username, success: false, error: 'no linked Telegram chat for this user' }));

    const text = formatAlertMessage(alert);
    const sent = sendable.length > 0 ? await telegramService.sendToUsers(sendable, text) : [];
    const results = [...sent, ...unresolved];
    const failures = results.filter((result) => !result.success);

    return res.status(failures.length > 0 ? 207 : 200).json({
      drain: 'TELEGRAM',
      results,
    });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to send Telegram notifications', details: err.message });
  }
});

module.exports = router;
