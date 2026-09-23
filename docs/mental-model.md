# Mental model

## This service is a "drain", not the alerting system

`telegram_service` doesn't decide what's an alert, doesn't own severities or on-call schedules, and doesn't decide who's "concerned" about what. Some upstream system (your alerting/monitoring backend) already knows all of that. This service's only job is: **given an alert and a list of concerned users, deliver it over Telegram.**

The `x-drains` header on `POST /alerts` is designed for a world with more than one delivery channel. An upstream caller can send `x-drains: TELEGRAM,EMAIL,WHATSAPP` without knowing (or caring) which drains are actually implemented yet — unimplemented drains are reported back as `skipped` instead of causing an error. Today only `TELEGRAM` is implemented.

## Users are identified by `username`, not by Telegram chat id

The upstream system knows its own users by whatever identifier it already uses (an email, an internal user id, a handle — this service just calls it `username` and treats it as an opaque string). It does **not** know, and shouldn't need to know, each user's Telegram chat id — that's Telegram-specific plumbing this service owns.

So the service keeps its own mapping, `{ username, chatId }`, in a `users` MongoDB collection. `POST /alerts` accepts either:
- `{ "username": "alice" }` — resolved against that collection, or
- `{ "telegramChatId": "123456789" }` — used directly, if the caller already has it for some reason.

## A bot can't message a user first — the user has to "link" themselves

Telegram bots cannot initiate a DM with a user. A user has to open a chat with the bot and press **Start** at least once before the bot can ever send them anything. That's a hard platform constraint, not a design choice — it shapes the whole "linking" flow described in [workflow.md](./workflow.md).

Because of that constraint, populating the `users` collection can't be a single API call — it has to be a two-step handshake:

1. Your backend asks this service for a Telegram deep link for a given `username` (`GET /auth/telegram`).
2. The user opens that link in Telegram and presses **Start**; only *then* does this service learn their chat id and can complete the mapping.

## Why the link uses a short opaque token instead of the username directly

The deep link (`https://t.me/<bot>?start=<payload>`) hands its payload to a stranger's Telegram client — anyone who sees the URL can trigger `/start <payload>` themselves. If the payload were just the raw `username`, anyone who guessed or intercepted a link could link *their own* Telegram account to *someone else's* username and start receiving (or worse, being trusted for) that user's alerts.

Instead, `/auth/telegram` mints a random, single-use, short-lived token, stores `{ token, username }` server-side, and puts only the token in the link. The token is meaningless on its own — it has to be exchanged, server-side, for the username it was minted for. It also expires (10 minutes, via a MongoDB TTL index) and is deleted the instant it's used, so a link can't be replayed or shared later.

## Why `/auth/telegram` itself requires the shared secret

Minting a link is "on behalf of a username" — exactly the kind of action that needs to come from a trusted caller (your backend, which has already authenticated the real user), not directly from a browser. That's why `/auth/telegram` sits behind the same `x-shared-secret` check as `/alerts`: only systems that already know the secret can request a link for a given username. The actual end user never talks to this service directly — they only ever interact with it via Telegram itself, after your backend has handed them a link.

## Summary of the trust boundary

```
your backend (has SHARED_SECRET) ──▶ telegram_service ──▶ Telegram
        │                                                      │
        └──────────────── user's browser / Telegram app ◀──────┘
```

The shared secret authenticates *your backend* to this service. The Telegram link authenticates *the user* to Telegram (and, transitively, ties their chat id to the username your backend asked for).
