const { Api } = require('node-telegram-bot-api');
const config = require('../config');

let api = null;

function getApi() {
  if (!api) {
    if (!config.telegramBotToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured on this service');
    }
    api = new Api(config.telegramBotToken);
  }
  return api;
}

/**
 * Sends `text` to every user's Telegram chat and reports per-user success/failure
 * rather than failing the whole batch when one delivery fails.
 */
async function sendToUsers(users, text) {
  const client = getApi();

  const results = await Promise.allSettled(
    users.map((user) => client.sendMessage({ chat_id: user.telegramChatId, text }))
  );

  return results.map((result, index) => {
    const user = users[index];
    if (result.status === 'fulfilled') {
      return { telegramChatId: user.telegramChatId, username: user.username, success: true };
    }
    return {
      telegramChatId: user.telegramChatId,
      username: user.username,
      success: false,
      error: result.reason?.message || String(result.reason),
    };
  });
}

let cachedBotUsername = null;

/** The bot's own @username, needed to build https://t.me/<username>?start=... deep links. */
async function getBotUsername() {
  if (!cachedBotUsername) {
    const me = await getApi().getMe();
    cachedBotUsername = me.username;
  }
  return cachedBotUsername;
}

module.exports = { sendToUsers, getApi, getBotUsername };
