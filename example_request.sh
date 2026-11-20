#!/usr/bin/env bash
# Example requests for the telegram_service flow.
# Set SHARED_SECRET in your environment (matching your .env) before running:
#   SHARED_SECRET=... bash example_request.sh

BASE_URL="http://localhost:3000"
SECRET="my_secret"

# 1. Link flow: generate a Telegram deep link for a given username and follow
#    the redirect. In real usage your backend calls this server-side and hands
#    the resulting t.me URL to the frontend as a "Connect Telegram" link; the
#    user then opens it in Telegram and sends /start, which the bot listener
#    (src/bot/linkBot.js) picks up and stores { username, chatId } in Mongo.
curl -i -X GET "$BASE_URL/auth/telegram?username=alice" \
  -H "x-shared-secret: $SECRET"

# Grab the "location" URL printed above, open it in Telegram, and press
# "Start" — the script waits here so the alert calls below don't race ahead
# of you actually completing the link.
echo
read -p "Opened the link and pressed Start in Telegram? Press Enter to continue... " _

# 2. Send an alert to users by username (resolved against the `users`
#    collection populated by step 1's link flow).
curl -X POST "$BASE_URL/alerts" \
  -H "x-shared-secret: $SECRET" \
  -H "x-drains: TELEGRAM" \
  -H "Content-Type: application/json" \
  -d '{
    "alert": {
      "title": "High CPU usage",
      "message": "CPU usage exceeded 90% on host web-01",
      "severity": "critical",
      "metric": "cpu.usage.web-01"
    },
    "users": [
      { "username": "alice" },
      { "username": "bob" }
    ]
  }'

# 3. Send an alert straight to a known Telegram chat id, bypassing the
#    username lookup (still supported alongside step 2's username form).
curl -X POST "$BASE_URL/alerts" \
  -H "x-shared-secret: $SECRET" \
  -H "x-drains: TELEGRAM" \
  -H "Content-Type: application/json" \
  -d '{"alert":{"title":"High CPU usage","message":"CPU usage exceeded 90% on host web-01","severity":"critical"},"users":[{"telegramChatId":"123456789"}]}'

# 4. Alert with a mixed drains list — only TELEGRAM is handled today, the
#    rest are reported back as "skipped" instead of erroring.
curl -X POST "$BASE_URL/alerts" \
  -H "x-shared-secret: $SECRET" \
  -H "x-drains: TELEGRAM,EMAIL,WHATSAPP" \
  -H "Content-Type: application/json" \
  -d '{"alert":{"title":"Disk almost full","message":"Disk usage at 95% on db-01"},"users":[{"username":"alice"}]}'

# 5. Cooldown demo: two non-critical alerts for the same `metric` back to
#    back. The first sends normally; the second (within DEFAULT_COOLDOWN_SECONDS)
#    comes back 200 with every user marked success:false and a cooldown error
#    instead of hitting Telegram again. Use "severity": "critical" to bypass this.
curl -X POST "$BASE_URL/alerts" \
  -H "x-shared-secret: $SECRET" \
  -H "x-drains: TELEGRAM" \
  -H "Content-Type: application/json" \
  -d '{"alert":{"title":"Disk almost full","message":"Disk usage at 95% on db-01","severity":"warning","metric":"disk.usage.db-01"},"users":[{"username":"alice"}]}'

curl -X POST "$BASE_URL/alerts" \
  -H "x-shared-secret: $SECRET" \
  -H "x-drains: TELEGRAM" \
  -H "Content-Type: application/json" \
  -d '{"alert":{"title":"Disk almost full","message":"Disk usage at 95% on db-01","severity":"warning","metric":"disk.usage.db-01"},"users":[{"username":"alice"}]}'
