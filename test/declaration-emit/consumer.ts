// Emitting declarations for exported keys must work (TS2527 "inaccessible unique symbol" otherwise).
// `npm run typecheck` emits this file's .d.ts through tsconfig.dts.json.
import { skipToken } from '@tanstack/query-core';
import { createMutationKeys, createQueryKeyStore, createQueryKeys, mergeQueryKeys } from '../../src';

export const todos = createQueryKeys('todos', {
  all: null,
  count: ['total'],
  detail: (id: number) => ({
    queryKey: [id],
    queryFn: () => Promise.resolve({ id }),
    contextQueries: { comments: { queryKey: null, queryFn: () => Promise.resolve(['nice']) } },
  }),
  maybe: (id?: number) => ({ queryKey: [id], queryFn: id ? () => Promise.resolve(id) : skipToken }),
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

export const store = createQueryKeyStore({ users: null, posts: { one: (id: string) => [id] } });

export const queries = mergeQueryKeys(todos, todoMutations);
