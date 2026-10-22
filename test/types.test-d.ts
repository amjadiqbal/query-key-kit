import { type InfiniteData, QueryClient, type QueryFunctionContext, skipToken } from '@tanstack/query-core';
import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useQuery as useVueQuery } from '@tanstack/vue-query';
import { describe, expectTypeOf, it } from 'vitest';
import {
  createQueryKeyStore,
  createQueryKeys,
  getScopeData,
  type inferQueryData,
  type inferQueryKeyStore,
  type inferQueryKeys,
  invalidateScope,
  mergeQueryKeys,
  setScopeData,
  type TypedUseQueryOptions,
} from '../src';
import { api, type Comment, type Todo, type TodoFilters, type TodoPage, todoMutations, todos } from './fixtures';

const client = new QueryClient();

describe('keys', () => {
  it('infers exact key tuples', () => {
    expectTypeOf(todos._def).toEqualTypeOf<readonly ['todos']>();
    expectTypeOf(todos.all.queryKey).toEqualTypeOf<readonly ['todos', 'all']>();
    expectTypeOf(todos.detail._def).toEqualTypeOf<readonly ['todos', 'detail']>();
    expectTypeOf(todos.search('x').queryKey).toEqualTypeOf<readonly ['todos', 'search', string]>();
    expectTypeOf(todos.count._def).toEqualTypeOf<readonly ['todos', 'count']>();
    expectTypeOf(todos.count.queryKey).toEqualTypeOf<readonly ['todos', 'count', string]>();
    expectTypeOf(todos.detail(1)._ctx.comments.queryKey).toExtend<readonly ['todos', 'detail', number, 'comments']>();
  });

  it('brands keys with the query data, so cache reads are typed (as queryOptions does)', () => {
    expectTypeOf(client.getQueryData(todos.detail(1).queryKey)).toEqualTypeOf<Todo | undefined>();
    expectTypeOf(client.getQueryData(todos.list({ status: 'all' }).queryKey)).toEqualTypeOf<Todo[] | undefined>();
    expectTypeOf(client.getQueryData(todos.detail(1)._ctx.comments.queryKey)).toEqualTypeOf<Comment[] | undefined>();
    expectTypeOf(client.getQueryData(todos.feed({ status: 'all' }).queryKey)).toEqualTypeOf<
      InfiniteData<TodoPage> | undefined
    >();
  });

  it('rejects reserved entry names', () => {
    // @ts-expect-error `_def` is reserved
    createQueryKeys('bad', { _def: null });
  });
});

describe('React Query v5 hooks', () => {
  it('useQuery infers data from the entry', () => {
    const query = useQuery(todos.detail(1));
    expectTypeOf(query.data).toEqualTypeOf<Todo | undefined>();
    expectTypeOf(useQuery(todos.stats).data).toEqualTypeOf<{ open: number; done: number } | undefined>();
    expectTypeOf(useSuspenseQuery(todos.detail(1)).data).toEqualTypeOf<Todo>();
  });

  it('accepts any option on the entry: staleTime, placeholderData, initialData (lukemorales #83, #85, #76)', () => {
    const withInitial = createQueryKeys('t', {
      one: { queryKey: null, queryFn: () => api.getTodo(1), initialData: { id: 1, title: '', done: false } as Todo },
    });
    expectTypeOf(useQuery(withInitial.one).data).toEqualTypeOf<Todo>();
    expectTypeOf(todos.stats.staleTime).toEqualTypeOf<number>();
    expectTypeOf(useQuery(todos.list({ status: 'all' })).data).toEqualTypeOf<Todo[] | undefined>();
  });

  it('allows overriding options at the call site', () => {
    const query = useQuery({ ...todos.detail(1), select: (todo) => todo.title, enabled: false });
    expectTypeOf(query.data).toEqualTypeOf<string | undefined>();
  });

  it('useInfiniteQuery works with pageParam (lukemorales #89, #73)', () => {
    const query = useInfiniteQuery(todos.feed({ status: 'open' }));
    expectTypeOf(query.data).toEqualTypeOf<InfiniteData<TodoPage> | undefined>();

    const keys = createQueryKeys('mail', {
      list: (folder: string) => ({
        queryKey: [folder],
        queryFn: (ctx) => api.getPage(ctx.pageParam as number),
        initialPageParam: 0,
        getNextPageParam: (last: TodoPage) => last.nextCursor,
      }),
    });
    expectTypeOf(useInfiniteQuery(keys.list('inbox')).data).toEqualTypeOf<InfiniteData<TodoPage> | undefined>();
  });

  it('can be spread into the official queryOptions() and infiniteQueryOptions()', () => {
    const titleQuery = queryOptions({ ...todos.detail(1), select: (todo) => todo.title });
    expectTypeOf(useQuery(titleQuery).data).toEqualTypeOf<string | undefined>();
    expectTypeOf(client.getQueryData(titleQuery.queryKey)).toEqualTypeOf<Todo | undefined>();
    const feed = infiniteQueryOptions({ ...todos.feed({ status: 'all' }), maxPages: 3 });
    expectTypeOf(useInfiniteQuery(feed).data).toEqualTypeOf<InfiniteData<TodoPage> | undefined>();
  });

  it('keeps skipToken', () => {
    const keys = createQueryKeys('maybe', {
      detail: (id: number | undefined) => ({
        queryKey: [id],
        queryFn: id === undefined ? skipToken : () => api.getTodo(id),
      }),
    });
    expectTypeOf(useQuery(keys.detail(undefined)).data).toEqualTypeOf<Todo | undefined>();
  });

  it('works with useQueries', () => {
    const [a, b] = useQueries({ queries: [todos.detail(1), todos.list({ status: 'all' })] });
    expectTypeOf(a.data).toEqualTypeOf<Todo | undefined>();
    expectTypeOf(b.data).toEqualTypeOf<Todo[] | undefined>();
  });

  it('useMutation infers variables and result from mutationFn (lukemorales #55)', () => {
    const create = useMutation(todoMutations.create);
    expectTypeOf(create.mutateAsync).parameter(0).toEqualTypeOf<{ title: string }>();
    expectTypeOf(create.mutateAsync).returns.toEqualTypeOf<Promise<Todo>>();
    const toggle = useMutation(todoMutations.toggle(1));
    expectTypeOf(toggle.mutate).parameter(0).toEqualTypeOf<boolean>();
    expectTypeOf(todoMutations.toggle(1).mutationKey).toEqualTypeOf<readonly ['todos', 'toggle', number]>();
  });
});

describe('framework-agnostic', () => {
  it('Vue Query accepts the same entries', () => {
    const query = useVueQuery(todos.detail(1));
    expectTypeOf(query.data.value).toEqualTypeOf<Todo | undefined>();
  });

  it('QueryClient methods accept entries directly', () => {
    expectTypeOf(client.fetchQuery(todos.detail(1))).toEqualTypeOf<Promise<Todo>>();
    expectTypeOf(client.ensureQueryData(todos.list({ status: 'done' }))).toEqualTypeOf<Promise<Todo[]>>();
  });
});

describe('scope helpers', () => {
  it('types getScopeData and setScopeData from the factory', () => {
    expectTypeOf(getScopeData(client, todos.list)[0]![1]).toEqualTypeOf<Todo[] | undefined>();
    expectTypeOf(getScopeData(client, todos.detail)[0]![1]).toEqualTypeOf<Todo | Comment[] | undefined>();
    setScopeData(client, todos.list, (old) => {
      expectTypeOf(old).toEqualTypeOf<Todo[] | undefined>();
      return old;
    });
    // @ts-expect-error the updater must return list data
    setScopeData(client, todos.list, () => 'nope');
  });

  it('accepts any key node and rejects plain arrays', () => {
    invalidateScope(client, todos);
    invalidateScope(client, todos.detail);
    invalidateScope(client, todos.detail(1)._ctx.comments, { exact: true });
    // @ts-expect-error pass a node, not a raw key
    invalidateScope(client, ['todos']);
    // @ts-expect-error queryKey comes from the node
    invalidateScope(client, todos.detail, { queryKey: ['x'] });
  });
});

describe('lukemorales compatibility types', () => {
  it('inferQueryKeys and inferQueryKeyStore give plain keys', () => {
    type TodoKeys = inferQueryKeys<typeof todos>;
    expectTypeOf<TodoKeys['detail']['_def']>().toEqualTypeOf<readonly ['todos', 'detail']>();
    expectTypeOf<TodoKeys['list']['queryKey']>().toEqualTypeOf<readonly ['todos', 'list', { filters: TodoFilters }]>();
    expectTypeOf<TodoKeys['detail']['_ctx']['comments']['queryKey']>().toEqualTypeOf<
      readonly ['todos', 'detail', number, 'comments']
    >();

    const queries = mergeQueryKeys(todos);
    type Keys = inferQueryKeyStore<typeof queries>;
    const fetchList = async (ctx: QueryFunctionContext<Keys['todos']['list']['queryKey']>) => {
      const [, , { filters }] = ctx.queryKey;
      expectTypeOf(filters).toEqualTypeOf<TodoFilters>();
      return api.getTodos(filters);
    };
    useQuery({ ...todos.list({ status: 'all' }), queryFn: fetchList });
  });

  it('createQueryKeyStore matches createQueryKeys', () => {
    const store = createQueryKeyStore({
      todos: { detail: (id: number) => ({ queryKey: [id], queryFn: () => api.getTodo(id) }) },
      users: null,
    });
    expectTypeOf(store.users._def).toEqualTypeOf<readonly ['users']>();
    expectTypeOf(useQuery(store.todos.detail(1)).data).toEqualTypeOf<Todo | undefined>();
  });

  it('TypedUseQueryOptions and inferQueryData', () => {
    expectTypeOf<inferQueryData<typeof todos.detail>>().toEqualTypeOf<Todo>();
    const useTodo = (id: number, options?: Partial<TypedUseQueryOptions<typeof todos.detail>>) =>
      useQuery({ ...todos.detail(id), ...options });
    expectTypeOf(useTodo(1).data).toEqualTypeOf<Todo | undefined>();
  });
});
