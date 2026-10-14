# How name search works

A one-page guide to how Renew Your License reads the **Your full name** box. Type a
name and the page shows the parts the portal splits it into, the rule the search
applies to each part, and the request the portal sends. It's for the QA, training,
and business analyst teams.

Live page: <https://nys-cdo.github.io/demo-ctr-name-search/>

The page searches nothing and stores nothing. It runs the portal's splitting
rules in the browser. The example names are illustrations, not license records.
Search engines are asked not to index it (`<meta name="robots" content="noindex, nofollow">`).

## Run it on your computer

You need Node.js 22 or later.

```sh
cd demo-ctr-search
npm ci
npm run dev
```

`npm run dev` prints a local address to open. `npm test` checks the split logic.
`npm run build` writes the site to `dist/`.

## How it's built

- [NYS Design System](https://designsystem.ny.gov/) components and tokens
  (`@nysds/components`, `@nysds/styles`), bundled with Vite.
- `src/name-split.js` copies the portal's `splitFullName` and its other name
  divisions, and names the rule the API applies to each part.
- `test/portal-splits.json` holds the portal's own answers for 30 names, so the
  tests fail if this copy drifts from the portal.
- `src/fonts/` holds Proxima Nova, the NYSDS typeface, which is licensed for New
  York State use.

## When the portal's rules change

1. Update `src/name-split.js` to match the portal's `src/format/full-name.ts` and
   the API's `src/domain/licenses/search.ts`.
2. Regenerate `test/portal-splits.json` from the portal's `splitFullName` and
   `otherNameDivisions`, then run `npm test`.
3. Update the examples and the "Checked on" date in `index.html`.

## Deploy

Every push to `main` runs the tests, builds the site, and publishes it to GitHub
Pages through `.github/workflows/deploy.yml`.
