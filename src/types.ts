import type * as QueryCore from '@tanstack/query-core';
import type {
  DefaultError,
  dataTagSymbol,
  InfiniteData,
  QueryFunction,
  QueryFunctionContext,
} from '@tanstack/query-core';

/** Any array that can be used as (part of) a query key. */
export type AnyKey = readonly unknown[];

/**
 * Key segments returned by a factory entry. The tuple member makes TypeScript infer
 * `[id]` as a tuple (`[string]`) instead of an array (`string[]`).
 */
export type KeyTuple = readonly [] | readonly [unknown, ...unknown[]];

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** A scope handle: the partial key that matches every query below this point. */
export type DefinitionKey<Key extends AnyKey> = { _def: readonly [...Key] };

/**
 * A query function as written inside a factory. `pageParam` is available for infinite queries.
 * The produced options retype `queryFn` against the full key; use `inferQueryKeys` to type the
 * context of a query function declared outside the factory.
 */
// biome-ignore lint/suspicious/noExplicitAny: the full key is not known while the entry is written
export type FactoryQueryFn = (context: QueryFunctionContext<any, any>) => unknown;

/**
 * Options a query entry may declare. `queryKey`, `queryFn` and `contextQueries` are read by the
 * factory; every other option (`staleTime`, `placeholderData`, `initialData`, `initialPageParam`,
 * `getNextPageParam`, `meta`, ...) is passed through unchanged.
 */
export interface QueryEntryOptions {
  queryKey?: KeyTuple | AnyKey | null;
  queryFn?: FactoryQueryFn | symbol;
  contextQueries?: QueryKeySchema;
  [option: string]: unknown;
}

// biome-ignore lint/suspicious/noExplicitAny: entry arguments are user-defined
export type DynamicQueryEntry = (...args: any[]) => KeyTuple | QueryEntryOptions;

export type QueryEntry = null | KeyTuple | QueryEntryOptions | DynamicQueryEntry;

/** Names starting with `_` are reserved for `_def` and `_ctx`. */
export type QueryKeySchema = { [name: string]: QueryEntry; [reserved: `_${string}`]: never };

// ---------------------------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------------------------

/** Removes a `DataTag` brand and returns the plain key tuple. */
export type StripTag<Key> = Key extends readonly unknown[] ? UntaggedTuple<Key> : never;

/**
 * Rebuilds a key element by element, which drops the `DataTag` brand (inferring `[...infer Items]`
 * from a branded tuple gives `unknown[]`). Keys of variable length become plain readonly arrays.
 */
type UntaggedTuple<Key extends readonly unknown[], Items extends unknown[] = []> = number extends Key['length']
  ? readonly Key[number][]
  : Items['length'] extends Key['length']
    ? readonly [...Items]
    : UntaggedTuple<Key, [...Items, Key[Items['length']]]>;

/** `typeof skipToken`, which @tanstack/query-core exports from 5.25 on. */
type SkipTokenType = typeof QueryCore extends { skipToken: infer Token } ? Token : never;

/** `typeof dataTagErrorSymbol`, which @tanstack/query-core exports from 5.62 on. */
type DataTagErrorSymbol = typeof QueryCore extends { dataTagErrorSymbol: infer ErrorSymbol extends symbol }
  ? ErrorSymbol
  : never;

/**
 * The brand `queryOptions()` puts on a key, so `getQueryData` and friends infer the data type.
 * Built here instead of with `DataTag<Key, Data>` because that alias defaults the error type to an
 * unexported `unique symbol`, which breaks declaration emit for anyone exporting their keys.
 */
export type TaggedKey<Key extends AnyKey, Data> = Key & { [dataTagSymbol]: Data } & ([DataTagErrorSymbol] extends [
    never,
  ]
    ? unknown
    : { [ErrorKey in DataTagErrorSymbol]: DefaultError });

/** Data type carried by a `DataTag`-branded key, or `Fallback` when the key is not tagged. */
export type TagData<Key, Fallback = unknown> = Key extends { [dataTagSymbol]: infer Data } ? Data : Fallback;

type IsInfinite<Options> = 'initialPageParam' extends keyof Options ? true : false;

type PageParamOf<Options> = Options extends { initialPageParam: infer PageParam } ? PageParam : never;

type QueryFnData<Options> = Options extends { queryFn?: infer Fn }
  ? Exclude<Fn, symbol | undefined> extends (...args: never[]) => infer Result
    ? Awaited<Result>
    : unknown
  : unknown;

/**
 * What `queryClient.getQueryData(entry.queryKey)` returns for an entry. Infinite entries use
 * `InfiniteData<Page>`, as `infiniteQueryOptions()` does.
 */
export type EntryCacheData<Options> =
  IsInfinite<Options> extends true ? InfiniteData<QueryFnData<Options>> : QueryFnData<Options>;

type HasQueryFn<Options> = Options extends { queryFn: unknown } ? true : false;

type EntryKeySegments<Options> = Options extends { queryKey: infer Key }
  ? Key extends readonly unknown[]
    ? UntaggedTuple<Key>
    : readonly []
  : readonly [];

type HasEntryKey<Options> = Options extends { queryKey: infer Key }
  ? Key extends readonly unknown[]
    ? true
    : false
  : false;

type QueryFnOutput<Options, FullKey extends AnyKey> =
  HasQueryFn<Options> extends true
    ? {
        queryFn:
          | QueryFunction<
              QueryFnData<Options>,
              FullKey,
              IsInfinite<Options> extends true ? PageParamOf<Options> : never
            >
          | (Extract<Options extends { queryFn?: infer Fn } ? Fn : never, symbol> extends never
              ? never
              : SkipTokenType);
      }
    : unknown;

type ContextOutput<Options, FullKey extends AnyKey> = Options extends { contextQueries: infer Ctx }
  ? Ctx extends QueryKeySchema
    ? { _ctx: SchemaOutput<FullKey, Ctx> }
    : unknown
  : unknown;

type FullKeyOf<Base extends AnyKey, Options> = readonly [...Base, ...EntryKeySegments<Options>];

/** The options object an entry produces: a valid `queryOptions()` result plus `_ctx`. */
export type QueryOptionsOutput<Base extends AnyKey, Options> = Prettify<
  Omit<Options, 'queryKey' | 'queryFn' | 'contextQueries'> & {
    queryKey: HasQueryFn<Options> extends true
      ? TaggedKey<FullKeyOf<Base, Options>, EntryCacheData<Options>>
      : FullKeyOf<Base, Options>;
  } & QueryFnOutput<Options, FullKeyOf<Base, Options>> &
    ContextOutput<Options, FullKeyOf<Base, Options>>
>;

type StaticEntryOutput<Base extends AnyKey, Entry> = Entry extends null
  ? { queryKey: readonly [...Base] }
  : Entry extends readonly unknown[]
    ? Prettify<DefinitionKey<Base> & { queryKey: readonly [...Base, ...UntaggedTuple<Entry>] }>
    : HasEntryKey<Entry> extends true
      ? Prettify<DefinitionKey<Base> & QueryOptionsOutput<Base, Entry>>
      : QueryOptionsOutput<Base, Entry>;

type DynamicEntryOutput<Base extends AnyKey, Entry> = Entry extends (...args: infer Args) => infer Result
  ? ((
      ...args: Args
    ) => Result extends readonly unknown[]
      ? { queryKey: readonly [...Base, ...UntaggedTuple<Result>] }
      : QueryOptionsOutput<Base, Result>) &
      DefinitionKey<Base>
  : never;

export type EntryOutput<Base extends AnyKey, Entry> = Entry extends DynamicQueryEntry
  ? DynamicEntryOutput<Base, Entry>
  : StaticEntryOutput<Base, Entry>;

export type SchemaOutput<Base extends AnyKey, Schema> = {
  [K in keyof Schema & string]: EntryOutput<readonly [...Base, K], Schema[K]>;
};

/** The object `createQueryKeys(scope, schema)` returns. */
export type QueryKeyFactoryResult<Scope extends string, Schema> = Prettify<
  DefinitionKey<readonly [Scope]> & SchemaOutput<readonly [Scope], Schema>
>;

export type AnyQueryKeyFactoryResult = DefinitionKey<readonly [string]>;
