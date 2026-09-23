require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  sharedSecret: process.env.SHARED_SECRET,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  mongoUri: process.env.MONGO_URI,
};
