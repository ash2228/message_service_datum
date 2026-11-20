# Setup

## Prerequisites

- Node.js (tested on v24)
- A Telegram bot token — create one via [@BotFather](https://t.me/BotFather), `/newbot`
- A MongoDB connection string (Atlas or otherwise)

## Environment variables

Copy `.env.example` to `.env` and fill in real values:

| Variable | Purpose |
|---|---|
| `PORT` | port the Express server listens on (default `3000`) |
| `SHARED_SECRET` | the value callers must send as `x-shared-secret` on every request |
| `TELEGRAM_BOT_TOKEN` | bot token from BotFather |
| `MONGO_URI` | MongoDB connection string (either `mongodb://` or `mongodb+srv://`) |
| `DEFAULT_COOLDOWN_SECONDS` | how long a non-critical alert must wait before the same `metric` can be sent again (default `300`) |

`.env` is git-ignored — never commit real secrets.

## Install and run

```bash
npm install
npm start
```

On startup the service:
1. connects to MongoDB,
2. starts the Telegram bot's long-polling loop (for `/start` commands),
3. starts listening for HTTP requests on `PORT`.

## Trying it out

`example_request.sh` walks through the full flow (mint a link, link a username via Telegram, then send an alert to it). Edit `BASE_URL`/`SECRET` at the top to match your `.env`, then:

```bash
bash example_request.sh
```

It pauses after generating the Telegram link so you can actually open it and press **Start** before the alert requests fire — those will report `"no linked Telegram chat for this user"` if run before that step completes.

## Notes on `mongodb+srv://` URIs

Some restricted/sandboxed networks block DNS `SRV` record lookups (used by `mongodb+srv://`) while allowing normal `A`/`TXT` lookups and the actual MongoDB connection itself. If `npm start` hangs or fails with `querySrv ETIMEOUT`/`EBADRESP` in an environment like that, switch `MONGO_URI` to the equivalent non-SRV form: `mongodb://user:pass@host1:27017,host2:27017,host3:27017/dbname?replicaSet=...&authSource=admin&ssl=true` (Atlas's connection UI can show you this form, or resolve the SRV/TXT records yourself with `dig`).
