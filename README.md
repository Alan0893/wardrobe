# Wardrobe

Personal wardrobe catalog and outfit generator. Paste product links to save clothing items, generate outfit combinations with color harmony scoring, and get AI-powered style analysis.

## Quick Start

```bash
npm install
```

Set up your `.env` file:

```
DATABASE_URL="postgres://..."       # Prisma Postgres connection URL
AUTH_SECRET="..."                    # openssl rand -base64 32
OPENAI_API_KEY="sk-..."             # For style analysis (optional)
```

Push the schema and start the dev server:

```bash
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Add by URL** — paste a product page link; scrapes metadata (image, title, brand, category, color, season) and lets you confirm/edit before saving.
- **Wardrobe Catalog** — grid view with filtering/sorting. Duplicate items are grouped with a count badge.
- **Fit Generator** — outfit combos with layered clothing logic (base top + optional mid-layer + optional outer layer + bottom + shoes + accessory). Uses color harmony scoring to pick the best outfit from 15 candidates.
- **AI Style Analysis** — GPT-4o analyzes your wardrobe and returns a style profile, category balance, color palette insights, gap recommendations, and seasonal coverage.
- **Multi-user Auth** — email/password login. Each user has a private wardrobe.

## Tech Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma + PostgreSQL (Prisma Postgres)
- NextAuth v5 (Credentials provider, JWT sessions, bcrypt)
- OpenAI GPT-4o (style analysis)
- cheerio (HTML/OG scraping)

## Data Model

| Table             | Purpose                                |
| ----------------- | -------------------------------------- |
| User              | Registered user with hashed password   |
| Account / Session | Auth infrastructure (NextAuth)         |
| Item              | Clothing item scoped to a user         |
| Fit               | A saved outfit combination for a user  |
| FitItem           | Join table linking fits & items        |

## API Routes

| Method | Endpoint              | Description                        |
| ------ | --------------------- | ---------------------------------- |
| POST   | /api/signup           | Register new account               |
| POST   | /api/auth/[...next]   | NextAuth sign-in/callback          |
| POST   | /api/scrape           | Scrape product URL                 |
| GET    | /api/items            | List user's items (with filters)   |
| POST   | /api/items            | Create item                        |
| PATCH  | /api/items/:id        | Update item                        |
| DELETE | /api/items/:id        | Delete item                        |
| POST   | /api/fits/generate    | Generate outfit with color scoring |
| GET    | /api/fits             | List user's saved fits             |
| POST   | /api/fits             | Save a fit                         |
| DELETE | /api/fits/:id         | Delete a fit                       |
| POST   | /api/style-analysis   | AI wardrobe style analysis         |

## Deployment

Hosted on Vercel. Push to `main` triggers auto-deploy. Required env vars on Vercel:

- `DATABASE_URL`
- `AUTH_SECRET`
- `OPENAI_API_KEY`
