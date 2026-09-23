const express = require('express');
const alertsRouter = require('./src/routes/alerts');
const telegramAuthRouter = require('./src/routes/telegramAuth');
const config = require('./src/config');
const { connectMongo } = require('./src/db/mongoose');
const { startLinkBot } = require('./src/bot/linkBot');

const app = express();
app.use(express.json());
app.use(alertsRouter);
app.use(telegramAuthRouter);

async function start() {
  await connectMongo();
  console.log('connected to MongoDB');

  startLinkBot();
  console.log('telegram link bot polling for /start commands');

  app.listen(config.port, () => {
    console.log(`telegram_service listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('failed to start telegram_service:', err);
  process.exit(1);
});

module.exports = app;
