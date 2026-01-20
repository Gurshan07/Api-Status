<div align="center">

# Pulse Sync

**UTC-accurate API status monitoring using Cloudflare Workers and a read-only React dashboard.**

</div>

## What is Pulse Sync?

Pulse Sync is a lightweight monitoring tool that checks the health of multiple APIs on a fixed UTC schedule and exposes their status through a simple dashboard.

- All monitoring logic runs server-side
- The frontend only displays authoritative data
- No client-side guessing or correction

---

## Features

- Hourly API health checks (UTC)
- UTC-only timestamps
- Response time measurement
- Operational / Slow / Down status
- 30-day rolling history
- Cloudflare KV-based persistence
- Read-only React dashboard

---

## Tech Stack

- Cloudflare Workers
- React
- TypeScript
- Cloudflare KV
- Tailwind CSS

---

## Quick Start

```bash
git clone https://github.com/yourusername/pulse-sync.git
cd pulse-sync
npm install
wrangler login
wrangler dev
```
In a second terminal:

```bash
npm run dev
```

Built for reliability, not illusion.