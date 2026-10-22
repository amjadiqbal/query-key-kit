/** @internal */
export const isKeyArray = (value: unknown): value is readonly unknown[] => Array.isArray(value);

/**
 * @internal Returns the schema's own keys and rejects names starting with `_`, which are
 * reserved for `_def` and `_ctx`.
 */
export function assertSchemaKeys(schema: object): string[] {
  const keys = Object.keys(schema);

  for (const key of keys) {
    if (key.startsWith('_')) {
      throw new Error(`query-key-kit: "${key}" starts with "_", which is reserved for _def and _ctx`);
    }
  }

  return keys;
}

/**
 * @internal Non-enumerable marker on mutation scopes and function mutation entries, so the scope
 * helpers can reject them at run time (other mutation entries carry a `mutationKey`). Being
 * non-enumerable, it is not copied when `mergeQueryKeys` spreads a mutation scope into a store.
 */
export const mutationMarker: unique symbol = Symbol.for('query-key-kit.mutation') as never;

/** @internal */
export function markMutation<T extends object>(value: T): T {
  Object.defineProperty(value, mutationMarker, { value: true });
  return value;
}

/** @internal */
export const isMutationNode = (value: object): boolean => 'mutationKey' in value || mutationMarker in value;
