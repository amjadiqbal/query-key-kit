# Changelog

All notable changes to `@amjadiqbal/query-key-kit` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `createQueryKeys`, `createQueryKeyStore`, `mergeQueryKeys` and `createMutationKeys`, API-compatible with `@lukemorales/query-key-factory`.
- Entries return `queryOptions()`-shaped objects: `DataTag`-branded keys and a `queryFn` typed against the full key.
- Every query option on an entry is passed through (`staleTime`, `placeholderData`, `initialData`, `initialPageParam`, `getNextPageParam`, ...).
- Infinite queries: `pageParam` in `queryFn`, entries work with `useInfiniteQuery`.
- `skipToken` support.
- Typed scope helpers: `scopeKey`, `invalidateScope`, `refetchScope`, `cancelScope`, `removeScope`, `getScopeData`, `setScopeData`.
- Types: `inferQueryKeys`, `inferQueryKeyStore`, `inferQueryData`, `inferScopeData`, `TypedUseQueryOptions`.
- Works with `@tanstack/query-core` 5.0 and later, so every framework adapter.
