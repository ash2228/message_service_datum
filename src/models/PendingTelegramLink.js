const mongoose = require('mongoose');

const LINK_TTL_SECONDS = 10 * 60;

const pendingTelegramLinkSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    // TTL index: MongoDB deletes the doc once this age is reached, so an
    // unused link naturally expires instead of being usable forever.
    createdAt: { type: Date, default: Date.now, expires: LINK_TTL_SECONDS },
  },
  { collection: 'pending_telegram_links' }
);

module.exports = mongoose.model('PendingTelegramLink', pendingTelegramLinkSchema);
