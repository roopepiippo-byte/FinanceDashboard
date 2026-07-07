# Finance Dashboard

A local-first personal finance dashboard (Finnish UI, EUR). Import Nordea CSV
exports, categorize transactions, and track spending, budget, and net worth.

## Privacy

**All data stays in your browser.** Transactions are stored in your browser's
IndexedDB on your own device — nothing is ever sent to a server, and the app
works fully offline after loading. Clearing the site's browser data deletes
everything, so use the export feature if you want a backup of your categories.

## Try it

Open the live app (link in the repository sidebar), then:

1. Export your transactions from Nordea netbank as CSV.
2. Import the CSV on the **Tuo** page.
3. Categorize transactions on the **Luokittele** page — the app learns rules
   and suggests categories as you go.
4. Explore the dashboard, budget, and analysis views.

## Run locally

Requires Node.js 22+.

```sh
npm install
npm run dev
```

Other scripts: `npm test` (Vitest unit tests), `npm run build`,
`npm run lint`.

## Tech

React + TypeScript on Vite, Zustand, IndexedDB (`idb`), PapaParse, Recharts,
Tailwind CSS. Money is handled as integer cents everywhere; formatting to EUR
happens only at display time.

## License

[MIT](LICENSE)
