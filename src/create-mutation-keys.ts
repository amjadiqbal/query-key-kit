import { assertSchemaKeys, isKeyArray } from './internals';
import type { AnyKey, DefinitionKey, KeyTuple, Prettify } from './types';

/**
 * Options a mutation entry may declare. `mutationKey` and `contextMutations` are read by the
 * factory; `mutationFn` and every other option (`onSuccess`, `retry`, `meta`, ...) are passed
 * through with their own types, so `useMutation` infers the variables from `mutationFn`.
 */
export interface MutationEntryOptions {
  mutationKey?: KeyTuple | AnyKey | null;
  contextMutations?: MutationKeySchema;
  [option: string]: unknown;
}

// biome-ignore lint/suspicious/noExplicitAny: entry arguments are user-defined
export type DynamicMutationEntry = (...args: any[]) => KeyTuple | MutationEntryOptions;

export type MutationEntry = null | KeyTuple | MutationEntryOptions | DynamicMutationEntry;

export type MutationKeySchema = { [name: string]: MutationEntry; [reserved: `_${string}`]: never };

type Segments<Options> = Options extends { mutationKey: infer Key }
  ? Key extends readonly [...infer Items]
    ? Items
    : []
  : [];

type HasKey<Options> = Options extends { mutationKey: infer Key }
  ? Key extends readonly unknown[]
    ? true
    : false
  : false;

type MutationOptionsOutput<Base extends AnyKey, Options> = Prettify<
  Omit<Options, 'mutationKey' | 'contextMutations'> & {
    mutationKey: readonly [...Base, ...Segments<Options>];
  } & (Options extends { contextMutations: infer Ctx }
      ? { _ctx: MutationSchemaOutput<readonly [...Base, ...Segments<Options>], Ctx> }
      : unknown)
>;

type StaticMutationOutput<Base extends AnyKey, Entry> = Entry extends null
  ? { mutationKey: readonly [...Base] }
  : Entry extends readonly [...infer Items]
    ? { _def: readonly [...Base]; mutationKey: readonly [...Base, ...Items] }
    : HasKey<Entry> extends true
      ? Prettify<DefinitionKey<Base> & MutationOptionsOutput<Base, Entry>>
      : MutationOptionsOutput<Base, Entry>;

export type MutationEntryOutput<Base extends AnyKey, Entry> = Entry extends (...args: infer Args) => infer Result
  ? ((
      ...args: Args
    ) => Result extends readonly [...infer Items]
      ? { mutationKey: readonly [...Base, ...Items] }
      : MutationOptionsOutput<Base, Result>) &
      DefinitionKey<Base>
  : StaticMutationOutput<Base, Entry>;

export type MutationSchemaOutput<Base extends AnyKey, Schema> = {
  [K in keyof Schema & string]: MutationEntryOutput<readonly [...Base, K], Schema[K]>;
};

export type MutationKeyFactoryResult<Scope extends string, Schema> = Prettify<
  DefinitionKey<readonly [Scope]> & MutationSchemaOutput<readonly [Scope], Schema>
>;

function buildOptions(base: AnyKey, value: readonly unknown[] | MutationEntryOptions, withDef: boolean) {
  if (isKeyArray(value)) {
    return withDef ? { _def: base, mutationKey: [...base, ...value] } : { mutationKey: [...base, ...value] };
  }

  const { mutationKey, contextMutations, ...options } = value;
  const ownKey = mutationKey == null ? base : [...base, ...mutationKey];
  const result: Record<string, unknown> = { ...options, mutationKey: ownKey };

  if (withDef && mutationKey != null) result._def = base;
  if (contextMutations != null) result._ctx = buildSchema(contextMutations, ownKey);

  return result;
}

function buildSchema(schema: MutationKeySchema, base: AnyKey): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const name of assertSchemaKeys(schema)) {
    const entry = schema[name] as MutationEntry;
    const key = [...base, name];

    if (typeof entry === 'function') {
      output[name] = Object.assign((...args: unknown[]) => buildOptions(key, entry(...args), false), { _def: key });
    } else if (entry == null) {
      output[name] = { mutationKey: key };
    } else {
      output[name] = buildOptions(key, entry, true);
    }
  }

  return output;
}

/**
 * Creates a typed mutation-key scope. `mutationFn` keeps its own type, so
 * `useMutation(todoMutations.create)` infers the variables and result.
 *
 * ```ts
 * export const todoMutations = createMutationKeys('todos', {
 *   create: { mutationKey: null, mutationFn: (input: NewTodo) => api.createTodo(input) },
 * })
 * ```
 */
export function createMutationKeys<const Scope extends string>(scope: Scope): DefinitionKey<readonly [Scope]>;
export function createMutationKeys<const Scope extends string, Schema extends MutationKeySchema>(
  scope: Scope,
  schema: Schema,
): MutationKeyFactoryResult<Scope, Schema>;
export function createMutationKeys(scope: string, schema?: MutationKeySchema): unknown {
  const def = [scope] as const;

  if (schema == null) return { _def: def };

  return { ...buildSchema(schema, def), _def: def };
}
