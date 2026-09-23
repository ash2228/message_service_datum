const { Bot } = require('node-telegram-bot-api');
const config = require('../config');
const PendingTelegramLink = require('../models/PendingTelegramLink');
const User = require('../models/User');

let bot = null;

function buildBot() {
  const linkBot = new Bot(config.telegramBotToken);

  linkBot.command('start', async (ctx) => {
    const token = (ctx.match || '').toString().trim();
    const chatId = ctx.chatId;

    if (!token) {
      await ctx.reply('Hi! Open this bot from your account\'s "Connect Telegram" link to subscribe to alerts.');
      return;
    }

    // Atomic find+delete: the token can only ever complete one link, even under a race.
    const pending = await PendingTelegramLink.findOneAndDelete({ token });

    if (!pending) {
      await ctx.reply('This link is invalid or has expired. Please generate a new one from the app.');
      return;
    }

    await User.findOneAndUpdate(
      { username: pending.username },
      { username: pending.username, chatId: String(chatId) },
      { upsert: true, returnDocument: 'after' }
    );

    await ctx.reply(`You're linked as "${pending.username}". You'll receive alerts here from now on.`);
  });

  linkBot.catch((err) => {
    console.error('telegram link bot handler error:', err);
  });

  return linkBot;
}

function getLinkBot() {
  if (!bot) {
    if (!config.telegramBotToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured on this service');
    }
    bot = buildBot();
  }
  return bot;
}

/** Starts long-polling in the background; does not block the caller. */
function startLinkBot() {
  const linkBot = getLinkBot();
  linkBot.startPolling().catch((err) => {
    console.error('telegram link bot polling stopped unexpectedly:', err);
  });
}

module.exports = { startLinkBot };
