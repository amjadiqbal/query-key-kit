// Type-checked with TypeScript 5.0 against the built dist/index.d.ts (`npm run typecheck:ts5`,
// after `npm run build`), so the lowest TypeScript version the README names is really tested.

import {
  createMutationKeys,
  createQueryKeys,
  getScopeData,
  type inferQueryKeys,
  invalidateScope,
  mergeQueryKeys,
  setScopeData,
} from '@amjadiqbal/query-key-kit';
import { QueryClient } from '@tanstack/query-core';

type Todo = { id: number; title: string };

export const todos = createQueryKeys('todos', {
  all: null,
  detail: (id: number) => ({
    queryKey: [id],
    queryFn: (): Promise<Todo> => Promise.resolve({ id, title: '' }),
    staleTime: 1000,
    contextQueries: { comments: { queryKey: null, queryFn: () => Promise.resolve(['c']) } },
  }),
  feed: () => ({
    queryKey: ['feed'],
    queryFn: ({ pageParam }: { pageParam: number }) => Promise.resolve([pageParam]),
    initialPageParam: 0,
    getNextPageParam: (last: number[]) => (last[0] ?? 0) + 1,
  }),
});
export const todoMutations = createMutationKeys('todos', {
  create: { mutationKey: null, mutationFn: (title: string) => Promise.resolve(title) },
});
export const queries = mergeQueryKeys(todos, todoMutations);

const client = new QueryClient();
const cached: Todo | undefined = client.getQueryData(todos.detail(1).queryKey);
const fetched: Promise<Todo> = client.fetchQuery(todos.detail(1));
const details: Array<[readonly unknown[], Todo | string[] | undefined]> = getScopeData(client, todos.detail);
setScopeData(client, todos.detail, (old) => old);
void invalidateScope(client, queries.todos, { exact: false });
// @ts-expect-error mutation entries are not query scopes
void invalidateScope(client, todoMutations.create);
type Keys = inferQueryKeys<typeof todos>;
const key: Keys['detail']['queryKey'] = ['todos', 'detail', 1];
void [cached, fetched, details, key];
