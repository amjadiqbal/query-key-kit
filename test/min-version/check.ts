// Compiled against @tanstack/query-core 5.0.0 by `tsc -p tsconfig.min.json` (the lowest supported peer).
import { QueryClient } from '@tanstack/query-core';
import { createMutationKeys, createQueryKeys, getScopeData, invalidateScope, mergeQueryKeys } from '../../src';

type Todo = { id: number; title: string };

const todos = createQueryKeys('todos', {
  all: null,
  detail: (id: number) => ({ queryKey: [id], queryFn: (): Promise<Todo> => Promise.resolve({ id, title: '' }) }),
  feed: () => ({
    queryKey: ['feed'],
    queryFn: ({ pageParam }: { pageParam: number }) => Promise.resolve([pageParam]),
    initialPageParam: 0,
    getNextPageParam: (last: number[]) => (last[0] ?? 0) + 1,
  }),
});
const todoMutations = createMutationKeys('todos', {
  create: { mutationKey: null, mutationFn: (title: string) => Promise.resolve(title) },
});

const client = new QueryClient();
const data: Todo | undefined = client.getQueryData(todos.detail(1).queryKey);
const fetched: Promise<Todo> = client.fetchQuery(todos.detail(1));
const pages: Promise<{ pages: number[][]; pageParams: unknown[] }> = client.fetchInfiniteQuery(todos.feed());
const lists: Array<[readonly unknown[], Todo | undefined]> = getScopeData(client, todos.detail);
void invalidateScope(client, todos);
void [data, fetched, pages, lists, mergeQueryKeys(todos, todoMutations)];
