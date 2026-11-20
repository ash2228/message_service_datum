# Architecture

```
index.js                        entrypoint: connects Mongo, starts the link
                                 bot's polling loop, mounts routers, listens

src/
  config.js                     reads env vars once, exported as a plain object

  db/
    mongoose.js                 connectMongo() — memoized mongoose.connect()

  models/
    User.js                     users collection: { username, chatId }
    PendingTelegramLink.js      pending_telegram_links collection:
                                 { token, username, createdAt (TTL, 10 min) }
    MetricAlertState.js         metric_alert_state collection:
                                 { metric, lastSentAt } — cooldown bookkeeping

  middleware/
    verifySharedSecret.js       checks x-shared-secret against SHARED_SECRET
                                 (timing-safe compare); 401s on mismatch

  routes/
    alerts.js                   POST /alerts — the notify path
    telegramAuth.js             GET /auth/telegram — the link path

  services/
    telegramService.js          wraps the Telegram `Api` client:
                                 sendToUsers(), getBotUsername()
    cooldownService.js          shouldSend(metric, severity) — per-metric
                                 cooldown gate backed by MetricAlertState

  bot/
    linkBot.js                  the long-polling `Bot` instance that handles
                                 /start <token> and completes the link
```

## Two Telegram clients, two purposes

`node-telegram-bot-api` v2 splits "call the API" from "receive updates":

- **`Api`** (`src/services/telegramService.js`) — a stateless client used to *send* messages (`sendMessage`) and look up the bot's own identity (`getMe`, cached as `getBotUsername()`). `POST /alerts` only ever needs this.
- **`Bot`** (`src/bot/linkBot.js`) — a long-polling process that *receives* updates (specifically, `/start` commands) from Telegram. This is the only part of the service that's stateful/long-running rather than request/response — it's started once in `index.js` and runs for the life of the process.

## Data model

Two collections, both owned entirely by this service:

- **`users`** — the durable result of a successful link: `{ username, chatId }`. This is what `POST /alerts` reads from when a request names a `username` instead of a raw `telegramChatId`.
- **`pending_telegram_links`** — short-lived, in-flight link attempts: `{ token, username }`. A document here means "a link was requested for this username and is waiting for the user to press Start." A MongoDB TTL index on `createdAt` (10 minutes) means an abandoned link cleans itself up — no cron job needed. A document is also deleted the moment it's consumed (`findOneAndDelete`), so a token can't be reused.
- **`metric_alert_state`** — one document per `metric` ever seen: `{ metric, lastSentAt }`. `POST /alerts` reads and updates this via `cooldownService.shouldSend()` before dispatching a non-critical alert, so repeat alerts for the same `metric` are throttled instead of re-sent on every call.

## Why the shared-secret check is one small middleware, not duplicated logic

`src/middleware/verifySharedSecret.js` is mounted on both `POST /alerts` and `GET /auth/telegram` — both are "trusted backend calls this service" endpoints, as opposed to the `/start` bot command, which is "an end user interacts with Telegram" and is authenticated implicitly by Telegram itself (a chat id is only ever the person who actually pressed the button).
