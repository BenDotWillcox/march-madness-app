This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Bracket Data Entry

Bracket game assignments live in `data/bracket.json`.

- Use `home.teamId` and `away.teamId` to place teams into each game.
- Use `gameInfo.tipoff` for date/time and `gameInfo.location` for venue.
  - If tipoff time is unknown, you can set a date-only value like `2026-03-21`; UI will render it as `Mar 21 (TBD)`.
- Keep `teamId` as `null` for games that are not set yet.
- `sourceLabel` is display/help text and can be updated as needed.

Game id conventions:

- First Four: `first-four-1` through `first-four-4`
- Round of 64: `<region>-r64-<1..8>`
- Round of 32: `<region>-r32-<1..4>`
- Sweet 16: `<region>-s16-<1..2>`
- Elite 8: `<region>-e8-1`
- Final Four: `final-four-1`, `final-four-2`
- Title game: `championship-1`

Valid region keys: `east`, `west`, `south`, `midwest`.
