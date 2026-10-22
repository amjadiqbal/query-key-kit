import type { QueryClient, QueryKey, Updater } from '@tanstack/query-core';
import { isMutationNode } from './internals';
import type { AnyKey, TagData } from './types';

/**
 * A node of a query-key tree: a scope from `createQueryKeys`, an entry (`todos.detail`), a called
 * entry (`todos.detail(1)`) or a context query (`todos.detail(1)._ctx.comments`).
 */
export type KeyNode = { _def: AnyKey } | { queryKey: AnyKey };

type IsMutationEntry<Node> = Node extends { mutationKey: unknown }
  ? true
  : Node extends (...args: never[]) => infer Result
    ? IsMutationEntry<Result>
    : false;

type EntryFlags<Node> = { [K in keyof Node]: K extends `_${string}` ? never : IsMutationEntry<Node[K]> }[keyof Node];

/**
 * `true` for mutation entries and for scopes whose entries are all mutations: their keys are
 * mutation keys, and using them as query filters would match unrelated queries. A store scope
 * that merges queries and mutations is still a query scope.
 */
type IsMutationNode<Node> =
  IsMutationEntry<Node> extends true
    ? true
    : Node extends (...args: never[]) => unknown
      ? false
      : Node extends { _def: AnyKey }
        ? [EntryFlags<Node>] extends [never]
          ? false
          : [EntryFlags<Node>] extends [true]
            ? true
            : false
        : false;

/** Rejects mutation nodes at compile time; the scope helpers only work on query nodes. */
export type QueryNode<Node> = IsMutationNode<Node> extends true ? never : Node;

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
 * called entry, `_def` for a scope or a function entry. Throws for mutation entries and for
 * scopes created with `createMutationKeys`.
 */
export function scopeKey<Node extends KeyNode>(node: QueryNode<Node>): QueryKey {
  const value = node as KeyNode;
  if (isMutationNode(value))
    throw new Error('query-key-kit: scope helpers take query nodes, not mutation entries or scopes');
  if ('queryKey' in value) return value.queryKey;
  return value._def;
}

type FiltersOf<Method extends (...args: never[]) => unknown> = Omit<NonNullable<Parameters<Method>[0]>, 'queryKey'>;

/** Invalidates every query under `node`. Extra filters (`exact`, `type`, `predicate`, ...) are merged in. */
export function invalidateScope<Node extends KeyNode>(
  client: Pick<QueryClient, 'invalidateQueries'>,
  node: QueryNode<Node>,
  filters?: FiltersOf<QueryClient['invalidateQueries']>,
  options?: Parameters<QueryClient['invalidateQueries']>[1],
): Promise<void> {
  return client.invalidateQueries({ ...filters, queryKey: scopeKey(node) }, options);
}

/** Refetches every query under `node`. */
export function refetchScope<Node extends KeyNode>(
  client: Pick<QueryClient, 'refetchQueries'>,
  node: QueryNode<Node>,
  filters?: FiltersOf<QueryClient['refetchQueries']>,
  options?: Parameters<QueryClient['refetchQueries']>[1],
): Promise<void> {
  return client.refetchQueries({ ...filters, queryKey: scopeKey(node) }, options);
}

/** Cancels in-flight fetches of every query under `node`, e.g. before an optimistic update. */
export function cancelScope<Node extends KeyNode>(
  client: Pick<QueryClient, 'cancelQueries'>,
  node: QueryNode<Node>,
  filters?: FiltersOf<QueryClient['cancelQueries']>,
  options?: Parameters<QueryClient['cancelQueries']>[1],
): Promise<void> {
  return client.cancelQueries({ ...filters, queryKey: scopeKey(node) }, options);
}

/** Removes every query under `node` from the cache. */
export function removeScope<Node extends KeyNode>(
  client: Pick<QueryClient, 'removeQueries'>,
  node: QueryNode<Node>,
  filters?: FiltersOf<QueryClient['removeQueries']>,
): void {
  client.removeQueries({ ...filters, queryKey: scopeKey(node) });
}

/** Returns `[queryKey, data]` for every cached query under `node`, typed from the factory. */
export function getScopeData<Node extends KeyNode>(
  client: Pick<QueryClient, 'getQueriesData'>,
  node: QueryNode<Node>,
  filters?: FiltersOf<QueryClient['getQueriesData']>,
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
  client: Pick<QueryClient, 'setQueriesData'>,
  node: QueryNode<Node>,
  updater: Updater<ScopeData<Node> | undefined, ScopeData<Node> | undefined>,
  filters?: FiltersOf<QueryClient['setQueriesData']>,
): Array<[QueryKey, ScopeData<Node> | undefined]> {
  return client.setQueriesData({ ...filters, queryKey: scopeKey(node) }, updater) as Array<
    [QueryKey, ScopeData<Node> | undefined]
  >;
}
