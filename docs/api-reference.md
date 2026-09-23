# API reference

Both endpoints require the shared-secret header. There is no other authentication — treat `SHARED_SECRET` like a password shared only between this service and trusted backends.

## `GET /auth/telegram`

Mints a one-time Telegram deep link for a `username` and redirects to it.

**Headers**

| Header | Required | Value |
|---|---|---|
| `x-shared-secret` | yes | must equal `SHARED_SECRET` |

**Query params**

| Param | Required | Notes |
|---|---|---|
| `username` | yes | opaque identifier from your system; becomes the key in the `users` collection |

**Response**

- `302 Found`, `Location: https://t.me/<bot_username>?start=<token>` — success.
- `400` — missing `username`.
- `401` — missing/incorrect `x-shared-secret`.

```bash
curl -i "http://localhost:3000/auth/telegram?username=alice" \
  -H "x-shared-secret: $SHARED_SECRET"
```

---

## `POST /alerts`

Sends an alert to every concerned user over the drains listed in `x-drains` (only `TELEGRAM` is implemented; others are reported as skipped).

**Headers**

| Header | Required | Value |
|---|---|---|
| `x-shared-secret` | yes | must equal `SHARED_SECRET` |
| `x-drains` | yes | comma-separated list, e.g. `TELEGRAM,EMAIL,WHATSAPP` |
| `Content-Type` | yes | `application/json` |

**Body**

```json
{
  "alert": {
    "title": "High CPU usage",
    "message": "CPU usage exceeded 90% on host web-01",
    "severity": "critical"
  },
  "users": [
    { "username": "alice" },
    { "telegramChatId": "123456789" }
  ]
}
```

- `alert` — required; needs at least a `title` or a `message`. `severity` is optional and prefixed onto the outgoing text (e.g. `[CRITICAL]`).
- `users` — required, non-empty array. Each entry needs either:
  - `username` — resolved against the `users` collection (populated by the link flow), or
  - `telegramChatId` — used as-is, no lookup.

**Response**

- `200` — every user was delivered to successfully (or `x-drains` didn't include `TELEGRAM`, in which case nothing was sent and `processed`/`skipped` describe why).
- `207` — partial success; check `results` for which users failed and why.
- `400` — missing/invalid `x-drains`, `alert`, or `users`.
- `401` — missing/incorrect `x-shared-secret`.
- `502` — Telegram API unreachable.

```json
{
  "drain": "TELEGRAM",
  "results": [
    { "telegramChatId": "6610008742", "username": "alice", "success": true },
    { "username": "bob", "success": false, "error": "no linked Telegram chat for this user" }
  ]
}
```

```bash
curl -X POST "http://localhost:3000/alerts" \
  -H "x-shared-secret: $SHARED_SECRET" \
  -H "x-drains: TELEGRAM" \
  -H "Content-Type: application/json" \
  -d '{"alert":{"title":"High CPU usage","message":"CPU usage exceeded 90% on host web-01","severity":"critical"},"users":[{"username":"alice"}]}'
```

See [`example_request.sh`](../example_request.sh) for the full linking + alerting sequence.
