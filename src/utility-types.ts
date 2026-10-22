import type { DefaultError, QueryObserverOptions } from '@tanstack/query-core';
import type { ScopeData } from './scope';
import type { StripTag, TagData } from './types';

type KeyProps = 'queryKey' | 'mutationKey' | '_def' | '_ctx';

type InferRecord<Node> = {
  [K in keyof Node as K extends KeyProps ? K : never]: K extends '_ctx'
    ? { [C in keyof Node[K]]: InferNode<Node[K][C]> }
    : StripTag<Node[K]>;
};

type InferNode<Node> = Node extends readonly unknown[]
  ? Node
  : Node extends (...args: never[]) => infer Result
    ? { _def: Node extends { _def: infer Def } ? Def : never } & InferRecord<Result>
    : Node extends object
      ? InferRecord<Node>
      : never;

/** The keys of a scope from `createQueryKeys` / `createMutationKeys`, without options or functions. */
export type inferQueryKeys<Scope> = { [K in keyof Scope]: InferNode<Scope[K]> };

/** The keys of every scope in a store from `createQueryKeyStore` / `mergeQueryKeys`. */
export type inferQueryKeyStore<Store> = { [K in keyof Store]: inferQueryKeys<Store[K]> };

/** The cache data of every query a node matches (see `getScopeData`). */
export type inferScopeData<Node> = ScopeData<Node>;

/** The cache data of one entry, e.g. `inferQueryData<typeof todos.detail>`. */
export type inferQueryData<Entry> = Entry extends (...args: never[]) => infer Result
  ? inferQueryData<Result>
  : Entry extends { queryKey: infer Key }
    ? TagData<Key>
    : never;

type LooseOptions = { queryKey: readonly unknown[] };

type OptionsOf<Entry> = Entry extends (...args: never[]) => infer Result ? Result : Entry;

/**
 * Typed observer options for an entry, for custom hooks that accept extra options:
 * `options?: Partial<TypedUseQueryOptions<typeof todos.detail>>`.
 */
export type TypedUseQueryOptions<Entry extends LooseOptions | ((...args: never[]) => LooseOptions)> =
  QueryObserverOptions<
    inferQueryData<Entry>,
    DefaultError,
    inferQueryData<Entry>,
    inferQueryData<Entry>,
    StripTag<OptionsOf<Entry>['queryKey']>
  >;
