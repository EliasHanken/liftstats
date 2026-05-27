# One-Time Setup

## 1. Vercel + Neon

1. Create a Vercel account (free) and import this repo as a new project.
2. From Vercel project Settings → Storage → "Connect Database" → Marketplace → Neon. Install Neon, create a database named `powerlifting`.
3. Vercel auto-creates `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and related env vars under both Preview and Production environments.

## 2. Local development

1. Install Vercel CLI: `npm i -g vercel`
2. Link the project: `vercel link`
3. Pull env to local: `vercel env pull .env.local`
4. Run migrations against the dev database: `npm run db:migrate`
5. `npm run dev` — http://localhost:3000

## 3. Deploy

Pushing to `main` triggers a Vercel preview deploy. The `vercel --prod` CLI or the Vercel dashboard promotes to production.
