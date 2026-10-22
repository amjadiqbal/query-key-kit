import { createQueryKeys } from './create-query-keys';
import type { DefinitionKey, Prettify, QueryKeyFactoryResult, QueryKeySchema } from './types';

type QueryKeyStoreSchema = Record<string, null | QueryKeySchema>;

export type QueryKeyStore<StoreSchema extends QueryKeyStoreSchema> = {
  [Scope in keyof StoreSchema & string]: StoreSchema[Scope] extends QueryKeySchema
    ? QueryKeyFactoryResult<Scope, StoreSchema[Scope]>
    : DefinitionKey<readonly [Scope]>;
};

/** Declares every scope in one object. `null` creates a scope with only `_def`. */
export function createQueryKeyStore<const StoreSchema extends QueryKeyStoreSchema>(
  schema: StoreSchema,
): QueryKeyStore<StoreSchema> {
  const store: Record<string, unknown> = {};

  for (const scope of Object.keys(schema)) {
    const scopeSchema = schema[scope];
    store[scope] = scopeSchema ? createQueryKeys(scope, scopeSchema) : createQueryKeys(scope);
  }

  return store as QueryKeyStore<StoreSchema>;
}

type AnyScope = { _def: readonly [string, ...unknown[]] };

type MergedStore<Scopes extends readonly AnyScope[]> = Scopes extends readonly [
  infer First extends AnyScope,
  ...infer Rest extends readonly AnyScope[],
]
  ? { [Name in First['_def'][0]]: First } & MergedStore<Rest>
  : unknown;

/**
 * Merges scopes created by `createQueryKeys` or `createMutationKeys` into one store, keyed by
 * scope name. Query and mutation scopes with the same name are combined.
 */
export function mergeQueryKeys<const Scopes extends readonly AnyScope[]>(
  ...scopes: Scopes
): Prettify<MergedStore<Scopes>> {
  const store: Record<string, object> = {};

  for (const scope of scopes) {
    const [name] = scope._def;
    store[name] = { ...store[name], ...scope };
  }

  return store as Prettify<MergedStore<Scopes>>;
}
