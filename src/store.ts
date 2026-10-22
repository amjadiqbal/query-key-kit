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
 * scope name. Scopes with the same name (typically a query scope and a mutation scope) are
 * combined; if two of them define the same entry name, it throws instead of letting one
 * silently replace the other.
 */
export function mergeQueryKeys<const Scopes extends readonly AnyScope[]>(
  ...scopes: Scopes
): Prettify<MergedStore<Scopes>> {
  const store: Record<string, object> = {};

  for (const scope of scopes) {
    const [name] = scope._def;
    const existing = store[name];
    if (existing) {
      for (const entry of Object.keys(scope)) {
        if (entry !== '_def' && entry in existing) {
          throw new Error(`query-key-kit: mergeQueryKeys got "${entry}" twice in scope "${name}"`);
        }
      }
    }
    store[name] = { ...existing, ...scope };
  }

  return store as Prettify<MergedStore<Scopes>>;
}
