# telegram_service docs

A small Express service that fans alerts out to notification "drains" (Telegram today, more later) for whichever users are concerned by a given alert.

Read these in order if you're new to the service:

1. [Mental model](./mental-model.md) — the concepts (drains, users, linking) and why the service is shaped this way.
2. [Architecture](./architecture.md) — the files/modules and what each owns.
3. [Workflows](./workflow.md) — the two flows (linking a user, sending an alert) with sequence diagrams.
4. [API reference](./api-reference.md) — endpoints, headers, request/response shapes.
5. [Setup](./setup.md) — environment variables and running it locally.
