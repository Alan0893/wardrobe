# Wardrobe

Personal wardrobe catalog and outfit generator. Paste product links to save clothing items, then generate random outfit combinations from your collection.

## Quick Start

```bash
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Add by URL** — paste a product page link; the app scrapes Open Graph metadata (image, title, brand, price) and lets you confirm/edit before saving.
- **Wardrobe Catalog** — grid view of all items with category and color filters, inline edit and delete.
- **Fit Generator** — random outfit combos (top + bottom + shoes, optionally outerwear/accessory). Save fits you like.

## Tech Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite (`prisma/dev.db`)
- cheerio for HTML/OG scraping

## Data Model

| Table   | Purpose                        |
| ------- | ------------------------------ |
| Item    | Clothing item with metadata    |
| Fit     | A saved outfit combination     |
| FitItem | Join table linking fits & items |

## API Routes

| Method | Endpoint             | Description                |
| ------ | -------------------- | -------------------------- |
| POST   | /api/scrape          | Scrape product URL         |
| GET    | /api/items           | List items (with filters)  |
| POST   | /api/items           | Create item                |
| PATCH  | /api/items/:id       | Update item                |
| DELETE | /api/items/:id       | Delete item                |
| POST   | /api/fits/generate   | Generate random outfit     |
| GET    | /api/fits            | List saved fits            |
| POST   | /api/fits            | Save a fit                 |
| DELETE | /api/fits/:id        | Delete a fit               |
