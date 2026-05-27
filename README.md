# Powerlifting Stats

Public stats site for global powerlifting data. See `docs/superpowers/specs/2026-05-27-powerlifting-stats-design.md` for the design.

## Development

```bash
npm install
npm run dev          # localhost:3000
npm run test         # vitest
npm run lint
npm run typecheck
```

Requires Node.js 24+ and a `DATABASE_URL` pointing at a Neon Postgres instance.
