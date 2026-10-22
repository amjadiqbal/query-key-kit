# query-key-kit React example

A small Vite + React 19 app that uses every part of the README against a fake in-memory API:
entries with `contextQueries`, `placeholderData` and `staleTime`, an infinite query, a mutation
with an optimistic `setScopeData` update, `invalidateScope` on an entry, a function entry and a
whole scope, `getScopeData`, typed `getQueryData`, and compile-time checks in `src/typecheck.ts`.

```bash
npm install
npm run dev
```

Before a release, `npm run check:example` in the package root packs the package, installs that
tarball here and runs `tsc`. The browser check is done by hand: open the app, load all pages,
toggle todo 1 (watch "(saving)" appear in both lists), and use the cache buttons while watching
the "API calls" line.
