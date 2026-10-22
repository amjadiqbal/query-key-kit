import type { QueryKey, Updater } from '@tanstack/query-core';
import type { AnyKey, TagData } from './types';

/**
 * Anything with a key: a scope from `createQueryKeys`, an entry (`todos.detail`), a called entry
 * (`todos.detail(1)`), a context query (`todos.detail(1)._ctx.comments`) or a mutation entry.
 */
export type KeyNode = { _def: AnyKey } | { queryKey: AnyKey } | { mutationKey: AnyKey };

type CtxData<Node> = Node extends { _ctx: infer Ctx } ? { [K in keyof Ctx]: ScopeData<Ctx[K]> }[keyof Ctx] : never;

type EntriesData<Node> = {
  [K in keyof Node]: K extends `_${string}` ? never : ScopeData<Node[K]>;
}[keyof Node];

/**
 * The cache data of every query a node's key matches by prefix: its own data plus the data of
 * its context queries (or, for a scope, of all its entries). `unknown` when a matched query has
 * no `queryFn` to infer from.
 */
export type ScopeData<Node> = Node extends (...args: never[]) => infer Result
  ? ScopeData<Result>
  : Node extends { queryKey: infer Key }
    ? TagData<Key> | CtxData<Node>
    : Node extends { _def: AnyKey }
      ? EntriesData<Node>
      : never;

/**
 * The partial key that matches a node and everything below it: `queryKey` for an entry or a
 * called entry, `_def` for a scope or a function entry.
 */
export function scopeKey(node: KeyNode): QueryKey {
  if ('queryKey' in node) return node.queryKey;
  if ('mutationKey' in node) return node.mutationKey;
  return node._def;
}

type ScopeFilters = Record<string, unknown> & { queryKey?: never };

// biome-ignore lint/suspicious/noExplicitAny: accepts the QueryClient of every framework adapter
type AnyArgs = any;

/** Invalidates every query under `node`. Extra filters (`exact`, `type`, `predicate`, ...) are merged in. */
export function invalidateScope(
  client: { invalidateQueries(filters?: AnyArgs, options?: AnyArgs): Promise<void> },
  node: KeyNode,
  filters?: ScopeFilters,
  options?: AnyArgs,
): Promise<void> {
  return client.invalidateQueries({ ...filters, queryKey: scopeKey(node) }, options);
}

/** Refetches every query under `node`. */
export function refetchScope(
  client: { refetchQueries(filters?: AnyArgs, options?: AnyArgs): Promise<void> },
  node: KeyNode,
  filters?: ScopeFilters,
  options?: AnyArgs,
): Promise<void> {
  return client.refetchQueries({ ...filters, queryKey: scopeKey(node) }, options);
}

/** Cancels in-flight fetches of every query under `node`, e.g. before an optimistic update. */
export function cancelScope(
  client: { cancelQueries(filters?: AnyArgs, options?: AnyArgs): Promise<void> },
  node: KeyNode,
  filters?: ScopeFilters,
  options?: AnyArgs,
): Promise<void> {
  return client.cancelQueries({ ...filters, queryKey: scopeKey(node) }, options);
}

/** Removes every query under `node` from the cache. */
export function removeScope(
  client: { removeQueries(filters?: AnyArgs): void },
  node: KeyNode,
  filters?: ScopeFilters,
): void {
  client.removeQueries({ ...filters, queryKey: scopeKey(node) });
}

/** Returns `[queryKey, data]` for every cached query under `node`, typed from the factory. */
export function getScopeData<Node extends KeyNode>(
  client: { getQueriesData(filters: AnyArgs): Array<[QueryKey, unknown]> },
  node: Node,
  filters?: ScopeFilters,
): Array<[QueryKey, ScopeData<Node> | undefined]> {
  return client.getQueriesData({ ...filters, queryKey: scopeKey(node) }) as Array<
    [QueryKey, ScopeData<Node> | undefined]
  >;
}

/**
 * Updates every cached query under `node` with a typed updater, e.g. for optimistic updates of
 * every `todos.list(filters)` entry at once.
 */
export function setScopeData<Node extends KeyNode>(
  client: { setQueriesData(filters: AnyArgs, updater: AnyArgs, options?: AnyArgs): Array<[QueryKey, unknown]> },
  node: Node,
  updater: Updater<ScopeData<Node> | undefined, ScopeData<Node> | undefined>,
  filters?: ScopeFilters,
): Array<[QueryKey, ScopeData<Node> | undefined]> {
  return client.setQueriesData({ ...filters, queryKey: scopeKey(node) }, updater) as Array<
    [QueryKey, ScopeData<Node> | undefined]
  >;
}
