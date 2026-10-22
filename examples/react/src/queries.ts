import { createMutationKeys, createQueryKeys, mergeQueryKeys, type inferQueryKeyStore } from '@amjadiqbal/query-key-kit';
import { api, type Filters, type Page, type Todo } from './api';
export const todos = createQueryKeys('todos', {
  all: null,
  detail: (id: number) => ({ queryKey: [id], queryFn: () => api.getTodo(id), staleTime: 60_000, contextQueries: { comments: { queryKey: null, queryFn: () => api.getComments(id) } } }),
  list: (filters: Filters) => ({ queryKey: [{ filters }], queryFn: () => api.getTodos(filters), placeholderData: [] as Todo[] }),
  feed: () => ({ queryKey: ['pages'], queryFn: ({ pageParam }: { pageParam: number }) => api.getPage(pageParam), initialPageParam: 0, getNextPageParam: (last: Page) => last.nextCursor }),
});
export const todoMutations = createMutationKeys('todos', {
  setDone: (id: number) => ({ mutationKey: [id], mutationFn: (done: boolean) => api.setDone(id, done) }),
});
export const queries = mergeQueryKeys(todos, todoMutations);
export type QueryKeys = inferQueryKeyStore<typeof queries>;
