<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="art/banner-dark.png">
    <img alt="query-key-kit: typed query keys and invalidation helpers for TanStack Query v5" src="art/banner-light.png" width="100%">
  </picture>
</p>

# query-key-kit: typed query keys for TanStack Query v5

A typed **query-key factory** for TanStack Query v5 (React Query, Vue Query, Solid Query, Svelte Query, Angular Query). Organise your query keys in scopes, get real `queryOptions()` objects back with `DataTag`-branded keys, and invalidate or update whole branches of the cache with typed helpers. It keeps the API of `@lukemorales/query-key-factory`, so switching is an import change.

[![npm](https://img.shields.io/npm/v/@amjadiqbal/query-key-kit?style=flat-square)](https://www.npmjs.com/package/@amjadiqbal/query-key-kit)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@amjadiqbal/query-key-kit?style=flat-square&label=min%2Bgzip)](https://bundlephobia.com/package/@amjadiqbal/query-key-kit)
[![License](https://img.shields.io/npm/l/@amjadiqbal/query-key-kit?style=flat-square)](LICENSE.md)

```ts
import { createQueryKeys, invalidateScope } from '@amjadiqbal/query-key-kit';

export const todos = createQueryKeys('todos', {
  all: null,
  detail: (id: number) => ({
    queryKey: [id],
    queryFn: () => api.getTodo(id),
    staleTime: 30_000,
    contextQueries: {
      comments: { queryKey: null, queryFn: () => api.getComments(id) },
    },
  }),
  list: (filters: TodoFilters) => ({
    queryKey: [{ filters }],
    queryFn: () => api.getTodos(filters),
  }),
});

useQuery(todos.detail(1));                          // key ['todos', 'detail', 1], data: Todo | undefined
useQuery(todos.detail(1)._ctx.comments);            // key ['todos', 'detail', 1, 'comments']
queryClient.getQueryData(todos.detail(1).queryKey); // Todo | undefined, no cast

invalidateScope(queryClient, todos.list);      // every todos.list(...) query
invalidateScope(queryClient, todos.detail(1)); // detail 1 and its comments
invalidateScope(queryClient, todos);           // everything under 'todos'
```

## Why

TanStack Query v5's `queryOptions()` already keeps a key and its fetcher together. What it does not give you is a **key hierarchy**: one place that says which keys exist, how they nest, and which partial key to pass when you invalidate. Teams write that by hand, or use `@lukemorales/query-key-factory`, which gets about 400k downloads a week but has had no release since February 2024 and still has open v5 typing bugs.

query-key-kit is a maintained, v5-first take on the same idea:

- **Returns real query options.** Every entry produces what `queryOptions()` produces: a `DataTag`-branded `queryKey` (so `getQueryData`, `setQueryData` and `fetchQuery` are typed) and a `queryFn` typed against the full key.
- **Any query option on an entry.** `staleTime`, `gcTime`, `placeholderData`, `initialData`, `select`, `meta`, `enabled`, `initialPageParam`, `getNextPageParam`... are passed through unchanged.
- **Infinite queries.** `pageParam` is available in `queryFn`, and an entry with `initialPageParam` works with `useInfiniteQuery` and `fetchInfiniteQuery`.
- **Typed scope helpers.** `invalidateScope`, `refetchScope`, `cancelScope`, `removeScope`, `getScopeData` and `setScopeData` take any node of the tree and pick the right partial key. `getScopeData` and `setScopeData` know the data type of every query they match.
- **Mutations.** `createMutationKeys` keeps `mutationFn`'s own type, so `useMutation` infers variables and result.
- **Every framework.** It depends only on `@tanstack/query-core` types, so the same keys work with `@tanstack/react-query`, `vue-query`, `solid-query`, `svelte-query` and `angular-query-experimental`.
- **Small.** No runtime dependencies, ESM only, tree-shakeable.

## Install

```bash
npm install @amjadiqbal/query-key-kit
```

You also need TanStack Query v5 for your framework (for example `@tanstack/react-query`), which brings `@tanstack/query-core`. TypeScript 5.0 or newer.

## Declaring keys

`createQueryKeys(scope, schema)` takes a scope name and an object of entries. Each entry is one of:

| Entry | Example | Produces |
|---|---|---|
| `null` | `all: null` | `{ queryKey: ['todos', 'all'] }` |
| key tuple | `count: ['total']` | `{ _def: ['todos', 'count'], queryKey: ['todos', 'count', 'total'] }` |
| options object | `stats: { queryKey: null, queryFn, staleTime }` | query options with key `['todos', 'stats']` |
| function | `detail: (id: number) => ({ queryKey: [id], queryFn })` | a function returning query options, with `_def: ['todos', 'detail']` on the function |

An options object (returned directly or from a function) may contain:

- `queryKey`: extra key parts appended to the entry's path, or `null` for none.
- `queryFn`: the fetcher. It receives the **full** key in `ctx.queryKey`, plus `ctx.pageParam` for infinite queries. `skipToken` works.
- `contextQueries`: a nested schema whose keys extend this entry's key. They appear under `_ctx`.
- Any other query option, passed through as is.

Names starting with `_` are reserved for `_def` and `_ctx`, and are rejected at compile time and at run time.

### A single store, or scopes per feature

```ts
// One file
export const queries = createQueryKeyStore({
  users: null,
  todos: {
    detail: (id: number) => ({ queryKey: [id], queryFn: () => api.getTodo(id) }),
  },
});

// Or one scope per feature, merged
export const queries = mergeQueryKeys(users, todos, todoMutations);
queries.todos.detail(1);
```

`mergeQueryKeys` merges query and mutation scopes that share a name.

### Infinite queries

Give the entry `initialPageParam` and `getNextPageParam`. `queryFn` receives `pageParam`:

```ts
export const todos = createQueryKeys('todos', {
  feed: (filters: TodoFilters) => ({
    queryKey: [filters],
    queryFn: ({ pageParam }: { pageParam: number }) => api.getPage(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last: Page) => last.nextCursor,
  }),
});

useInfiniteQuery(todos.feed({ status: 'open' })); // data: InfiniteData<Page> | undefined
```

Callbacks inside an entry (`getNextPageParam`, `select`, `placeholderData` as a function) need their parameter annotated, because the entry is not tied to one query yet. Or add them at the call site, below.

### Overriding options at the call site

Entries are plain objects, so spread them, directly or through the official helpers:

```ts
useQuery({ ...todos.detail(id), enabled: !!id, select: (todo) => todo.title });

const titleQuery = queryOptions({ ...todos.detail(id), select: (todo) => todo.title });
const feed = infiniteQueryOptions({ ...todos.feed(filters), maxPages: 3 });
```

Don't wrap the entry itself in `queryOptions()` inside `createQueryKeys`: those options are typed for the inner key, and TanStack's hooks then reject the prefixed key.

## Invalidating and updating the cache

Every node of the tree knows its partial key. Pass the node, not a hand-written array:

```ts
import { cancelScope, getScopeData, invalidateScope, setScopeData } from '@amjadiqbal/query-key-kit';

await invalidateScope(queryClient, todos);                  // ['todos']
await invalidateScope(queryClient, todos.list);             // ['todos', 'list'], every filter
await invalidateScope(queryClient, todos.detail(1));        // ['todos', 'detail', 1] and its _ctx
await invalidateScope(queryClient, todos.detail(1), { exact: true }); // only that query

// Optimistic update of every cached list at once. `old` is Todo[] | undefined.
await cancelScope(queryClient, todos.list);
setScopeData(queryClient, todos.list, (old) => old?.map((t) => (t.id === id ? { ...t, done: true } : t)));

getScopeData(queryClient, todos.list); // Array<[QueryKey, Todo[] | undefined]>
```

| Helper | Calls |
|---|---|
| `invalidateScope(client, node, filters?, options?)` | `client.invalidateQueries` |
| `refetchScope(client, node, filters?, options?)` | `client.refetchQueries` |
| `cancelScope(client, node, filters?, options?)` | `client.cancelQueries` |
| `removeScope(client, node, filters?)` | `client.removeQueries` |
| `getScopeData(client, node, filters?)` | `client.getQueriesData`, typed |
| `setScopeData(client, node, updater, filters?)` | `client.setQueriesData`, typed |
| `scopeKey(node)` | returns the partial key |

The partial key is `queryKey` for an entry or a called entry, and `_def` for a scope or a function entry. `filters` takes every query filter except `queryKey` (`exact`, `type`, `stale`, `predicate`, ...). The `client` can be the `QueryClient` from any adapter. The data type of a node is the union of every query its key matches, including context queries; it is `unknown` when a matched entry has no `queryFn`.

You can still use the keys directly: `queryClient.invalidateQueries({ queryKey: todos.detail._def })`.

## Mutations

```ts
export const todoMutations = createMutationKeys('todos', {
  create: { mutationKey: null, mutationFn: (input: NewTodo) => api.createTodo(input) },
  toggle: (id: number) => ({ mutationKey: [id], mutationFn: (done: boolean) => api.setDone(id, done) }),
});

const create = useMutation(todoMutations.create);
create.mutate({ title: 'Ship it' }); // variables typed from mutationFn

const toggle = useMutation({
  ...todoMutations.toggle(1),
  onSuccess: () => invalidateScope(queryClient, todos.detail(1)),
});
```

## Types

| Type | Gives |
|---|---|
| `inferQueryKeys<typeof todos>` | the key tree (`queryKey`, `_def`, `_ctx`) without functions or options |
| `inferQueryKeyStore<typeof queries>` | the same for a whole store |
| `inferQueryData<typeof todos.detail>` | the data of an entry (`Todo`) |
| `inferScopeData<typeof todos.detail>` | the data of every query under a node |
| `TypedUseQueryOptions<typeof todos.detail>` | observer options for custom hooks |

```ts
type Keys = inferQueryKeyStore<typeof queries>;

const fetchList = async (ctx: QueryFunctionContext<Keys['todos']['list']['queryKey']>) => {
  const [, , { filters }] = ctx.queryKey; // typed
  return api.getTodos(filters);
};
```

## Migrating from `@lukemorales/query-key-factory`

1. Install and swap the import:

   ```bash
   npm uninstall @lukemorales/query-key-factory && npm install @amjadiqbal/query-key-kit
   ```

   ```bash
   grep -rl "@lukemorales/query-key-factory" src | xargs sed -i '' 's#@lukemorales/query-key-factory#@amjadiqbal/query-key-kit#g'
   ```

   (On Linux, use `sed -i` without the `''`.)

2. Run your type checker. `createQueryKeys`, `createQueryKeyStore`, `mergeQueryKeys`, `createMutationKeys`, `inferQueryKeys`, `inferQueryKeyStore` and `TypedUseQueryOptions` keep their names and their runtime output (`queryKey`, `queryFn`, `_def`, `_ctx`).

What changes:

- **Options are kept.** lukemorales silently dropped everything except `queryKey` and `queryFn` (its issues #83 and #85). Here `staleTime`, `placeholderData`, `initialData` and the rest reach `useQuery`. If you added options that never took effect, they now do.
- **Keys are `DataTag`-branded**, like `queryOptions()`. `getQueryData` returns your data type instead of `unknown`.
- **`ctx.pageParam` works** and infinite entries work with `useInfiniteQuery` (#89, #73).
- **Mutation variables are typed** from `mutationFn` (#55).
- **`initialData` gives defined data** from `useQuery` (#76).
- Entries keep your declaration order instead of being sorted. Keys are unchanged.
- Objects have a normal prototype instead of `Object.create(null)`.
- `inferQueryKeys` returns only keys (`queryKey`, `_def`, `_ctx`), not other options.
- `TypedUseQueryOptions` is built on query-core's `QueryObserverOptions`, so it works outside React too.

## What's tested

- Unit tests (Vitest) run every entry kind, context queries, stores, merging and mutations against a real `QueryClient` from `@tanstack/query-core`: fetching with the full key, infinite queries with page params, and every scope helper against a filled cache.
- Type tests (`expectTypeOf`) cover `useQuery`, `useSuspenseQuery`, `useInfiniteQuery`, `useQueries` and `useMutation` from `@tanstack/react-query`, `useQuery` from `@tanstack/vue-query`, spreading entries into `queryOptions()` / `infiniteQueryOptions()`, `skipToken`, `initialData`, and the compatibility types.
- Declaration emit is checked: a module that exports its keys compiles with `declaration: true`.
- The library also type-checks against `@tanstack/query-core` 5.0.0, the lowest supported version.
- Each release is checked in a real React app in the browser. Solid, Svelte and Angular rely on the shared query-core types and have no tests of their own yet.

## Support

- 🐛 **Bug or feature request**: [open an issue](https://github.com/amjadiqbal/query-key-kit/issues)
- 🔒 **Security issue**: please report privately via GitHub's security tab

## Need this built into your app, or something custom?

[Get in touch](https://amjad.com.pk/contact?utm_source=github&utm_medium=readme&utm_campaign=query-key-kit).

[![Hire me on Upwork](https://img.shields.io/badge/Hire%20me-Upwork-6FDA44?style=flat-square&logo=upwork&logoColor=white)](https://www.upwork.com/freelancers/amjadkhatri)

## More packages

Part of a family of open-source packages. See [all of them](https://github.com/amjadiqbal?tab=repositories).

| | |
|---|---|
| [start-seo-kit](https://github.com/amjadiqbal/start-seo-kit) | SEO for TanStack Start: meta tags, sitemaps, JSON-LD |

## Credits

The API follows [`@lukemorales/query-key-factory`](https://github.com/lukemorales/query-key-factory) by Luke Morales (MIT), which this package replaces. The code here is a new implementation for TanStack Query v5.

## License

MIT. See [LICENSE.md](LICENSE.md).
