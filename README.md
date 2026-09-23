# telegram_service

An Express service that delivers alerts to concerned users over Telegram. Callers hit `POST /alerts` with an alert payload and a list of users (by `username` or Telegram chat id); the service resolves usernames against a MongoDB-backed `users` collection and sends the message via a Telegram bot. Users link their `username` to Telegram once via a `GET /auth/telegram` deep-link flow.

## Docs

Start here: [docs/README.md](./docs/README.md)

- [Mental model](./docs/mental-model.md)
- [Architecture](./docs/architecture.md)
- [Workflows](./docs/workflow.md)
- [API reference](./docs/api-reference.md)
- [Setup](./docs/setup.md)

## Quick start

```bash
npm install
cp .env.example .env   # fill in SHARED_SECRET, TELEGRAM_BOT_TOKEN, MONGO_URI
npm start
```

Then see [`example_request.sh`](./example_request.sh) for a runnable walkthrough of the full flow.
