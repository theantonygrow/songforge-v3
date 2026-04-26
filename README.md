# SongForge v3 — Sonauto-style Generator

Fast Vercel-ready app with secure server-side Sonauto API integration.

## Run locally

```bash
npm install
cp .env.example .env.local
# put your real key into .env.local
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

1. Upload/push this folder to GitHub.
2. Import repo in Vercel.
3. In Vercel -> Project Settings -> Environment Variables, add:

```txt
SONAUTO_API_KEY=your_key
```

4. Redeploy.

## Security

Never put `SONAUTO_API_KEY` in frontend code. The browser only calls `/api/sonauto/*`.
