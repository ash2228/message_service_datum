require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  sharedSecret: process.env.SHARED_SECRET,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  mongoUri: process.env.MONGO_URI,
  defaultCooldownSeconds: parseInt(process.env.DEFAULT_COOLDOWN_SECONDS, 10) || 300,
};
