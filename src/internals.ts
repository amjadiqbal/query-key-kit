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
