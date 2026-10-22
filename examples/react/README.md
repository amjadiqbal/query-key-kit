# query-key-kit React example

A small Vite + React 19 app that exercises the main features against a fake in-memory API:
entries with `contextQueries`, `placeholderData` and `staleTime`, an infinite query, a mutation
key merged into the store with `mergeQueryKeys`, an optimistic `cancelScope` + `setScopeData`
update, `invalidateScope` on an entry, a function entry and a whole scope, `scopeKey`,
`getScopeData`, typed `getQueryData`, and compile-time checks (including `inferQueryKeyStore`) in
`src/typecheck.ts`. It does not use `createQueryKeyStore`, `refetchScope`, `removeScope`,
`TypedUseQueryOptions`, `skipToken`, `initialData`, `useSuspenseQuery` or `useQueries`; the
package's unit and type tests cover those.

```bash
npm install
npm run dev
```

Before a release, `npm run check:example` in the package root packs the package, installs that
tarball here and runs `tsc`. The browser check is done by hand: open the app, load all pages,
toggle todo 1 (watch "(saving)" appear in both lists), and use the cache buttons while watching
the "API calls" line.
