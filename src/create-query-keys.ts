import { assertSchemaKeys, isKeyArray } from './internals';
import type {
  AnyKey,
  DefinitionKey,
  QueryEntry,
  QueryEntryOptions,
  QueryKeyFactoryResult,
  QueryKeySchema,
} from './types';

/**
 * Turns one entry result (a key tuple or an options object) into query options whose key is
 * prefixed with `base`. Every option other than `contextQueries` is passed through.
 */
function buildOptions(base: AnyKey, value: KeyLike | QueryEntryOptions, withDef: boolean): Record<string, unknown> {
  if (isKeyArray(value)) {
    return withDef ? { _def: base, queryKey: [...base, ...value] } : { queryKey: [...base, ...value] };
  }

  const { queryKey, contextQueries, ...options } = value;
  const ownKey = queryKey == null ? base : [...base, ...queryKey];
  const result: Record<string, unknown> = { ...options, queryKey: ownKey };

  if (withDef && queryKey != null) result._def = base;
  if (contextQueries != null) result._ctx = buildSchema(contextQueries, ownKey);

  return result;
}

type KeyLike = readonly unknown[];

function buildEntry(base: AnyKey, entry: QueryEntry): unknown {
  if (typeof entry === 'function') {
    const dynamic = (...args: unknown[]) => buildOptions(base, entry(...args), false);
    return Object.assign(dynamic, { _def: base });
  }

  if (entry == null) return { queryKey: base };

  return buildOptions(base, entry, true);
}

/** @internal */
export function buildSchema(schema: QueryKeySchema, base: AnyKey): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const name of assertSchemaKeys(schema)) {
    output[name] = buildEntry([...base, name], schema[name] as QueryEntry);
  }

  return output;
}

/**
 * Creates a typed query-key scope.
 *
 * ```ts
 * export const todos = createQueryKeys('todos', {
 *   all: null,
 *   detail: (id: number) => ({ queryKey: [id], queryFn: () => getTodo(id) }),
 * })
 *
 * useQuery(todos.detail(1))                              // key: ['todos', 'detail', 1]
 * queryClient.invalidateQueries({ queryKey: todos._def }) // everything under 'todos'
 * ```
 */
export function createQueryKeys<const Scope extends string>(scope: Scope): DefinitionKey<readonly [Scope]>;
export function createQueryKeys<const Scope extends string, Schema extends QueryKeySchema>(
  scope: Scope,
  schema: Schema,
): QueryKeyFactoryResult<Scope, Schema>;
export function createQueryKeys(scope: string, schema?: QueryKeySchema): unknown {
  const def = [scope] as const;

  if (schema == null) return { _def: def };

  return { ...buildSchema(schema, def), _def: def };
}
