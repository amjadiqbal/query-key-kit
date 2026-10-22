# Changelog

All notable changes to `@amjadiqbal/query-key-kit` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.3] - 2026-10-23

### Fixed

- The scope helpers now reject every mutation node at run time, as the types already did: function mutation entries (`todoMutations.toggle`) and scopes from `createMutationKeys` now throw too. In 0.1.2 only nodes with a `mutationKey` threw, so the 0.1.2 entry below overstated it.

### Changed

- The TypeScript 5.0.4 check of the built `.d.ts` now runs with `skipLibCheck` off, against `@tanstack/query-core` 5.0.0 (newer query-core types need TypeScript 5.4+). In 0.1.2 it had `skipLibCheck` on, so it did not check the `.d.ts` itself.
- README and the example's README say which features the example covers instead of "every feature" (the 0.1.2 wording), and that Vue Query is type-tested only.

## [0.1.2] - 2026-10-23

### Fixed

- Scope helpers (`scopeKey`, `invalidateScope`, ...) no longer accept mutation entries or mutation-only scopes. They are rejected at compile time and `scopeKey` throws, because a mutation key used as a query filter matched unrelated queries.
- `mergeQueryKeys` throws when two merged scopes define the same entry name, instead of the later one silently replacing the earlier (while the type claimed both).

### Changed

- The scope helpers' `client` is typed as query-core's `QueryClient` (the method each helper calls) instead of `any`; adapter clients that extend it, such as Vue Query's, still fit. Filters and options use query-core's types.
- `TypedUseQueryOptions` takes an optional second type argument, `Data`, like `@lukemorales/query-key-factory`'s.
- README: migration notes list every difference from `@lukemorales/query-key-factory` instead of calling it a drop-in replacement; size and TypeScript claims are now measured or tested.

### Added

- `examples/react`, a Vite + React example using every feature, and `npm run check:example`, which type-checks it against the packed tarball.
- A TypeScript 5.0.4 type check of the built `.d.ts` in local CI.

## [0.1.1] - 2026-10-23

### Changed

- The npm package now includes `CHANGELOG.md`.
- README, package description and art say "framework-agnostic" instead of listing Solid, Svelte and Angular, which have no tests of their own yet.

## [0.1.0] - 2026-10-23

### Added

- `createQueryKeys`, `createQueryKeyStore`, `mergeQueryKeys` and `createMutationKeys`, API-compatible with `@lukemorales/query-key-factory`.
- Entries return `queryOptions()`-shaped objects: `DataTag`-branded keys and a `queryFn` typed against the full key.
- Every query option on an entry is passed through (`staleTime`, `placeholderData`, `initialData`, `initialPageParam`, `getNextPageParam`, ...).
- Infinite queries: `pageParam` in `queryFn`, entries work with `useInfiniteQuery`.
- `skipToken` support.
- Typed scope helpers: `scopeKey`, `invalidateScope`, `refetchScope`, `cancelScope`, `removeScope`, `getScopeData`, `setScopeData`.
- Types: `inferQueryKeys`, `inferQueryKeyStore`, `inferQueryData`, `inferScopeData`, `TypedUseQueryOptions`.
- Works with `@tanstack/query-core` 5.0 and later, so every framework adapter.

[Unreleased]: https://github.com/amjadiqbal/query-key-kit/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/amjadiqbal/query-key-kit/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/amjadiqbal/query-key-kit/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/amjadiqbal/query-key-kit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/amjadiqbal/query-key-kit/releases/tag/v0.1.0
