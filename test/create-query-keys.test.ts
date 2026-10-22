import { QueryClient } from '@tanstack/query-core';
import { describe, expect, it, vi } from 'vitest';
import { createMutationKeys, createQueryKeyStore, createQueryKeys, mergeQueryKeys } from '../src';
import { api, todoMutations, todos, users } from './fixtures';

describe('createQueryKeys', () => {
  it('creates a scope with only _def', () => {
    expect(users).toEqual({ _def: ['users'] });
  });

  it('builds keys for every entry kind', () => {
    expect(todos._def).toEqual(['todos']);
    expect(todos.all).toEqual({ queryKey: ['todos', 'all'] });
    expect(todos.count).toEqual({ _def: ['todos', 'count'], queryKey: ['todos', 'count', 'total'] });
    expect(todos.stats.queryKey).toEqual(['todos', 'stats']);
    expect('_def' in todos.stats).toBe(false);
    expect(todos.detail._def).toEqual(['todos', 'detail']);
    expect(todos.detail(1).queryKey).toEqual(['todos', 'detail', 1]);
    expect(todos.list({ status: 'open' }).queryKey).toEqual(['todos', 'list', { filters: { status: 'open' } }]);
    expect(todos.search('milk')).toEqual({ queryKey: ['todos', 'search', 'milk'] });
  });

  it('builds context queries under the parent key', () => {
    const detail = todos.detail(7);
    expect(detail._ctx.comments.queryKey).toEqual(['todos', 'detail', 7, 'comments']);
    expect(typeof detail._ctx.comments.queryFn).toBe('function');
  });

  it('passes every other query option through', () => {
    expect(todos.stats.staleTime).toBe(60_000);
    expect(todos.list({ status: 'all' }).placeholderData).toEqual([]);
    const feed = todos.feed({ status: 'all' });
    expect(feed.initialPageParam).toBe(0);
    expect(feed.getNextPageParam({ items: [], nextCursor: 4 })).toBe(4);
    expect('contextQueries' in todos.detail(1)).toBe(false);
  });

  it('keeps the queryFn identity', () => {
    const queryFn = vi.fn(() => Promise.resolve(1));
    const keys = createQueryKeys('x', { one: { queryKey: null, queryFn } });
    expect(keys.one.queryFn).toBe(queryFn);
  });

  it('rejects entry names that start with an underscore', () => {
    // @ts-expect-error reserved name
    expect(() => createQueryKeys('x', { _ctx: null })).toThrow(/reserved/);
  });

  it('produces options QueryClient can fetch with, using the full key', async () => {
    const client = new QueryClient();
    const seen: unknown[] = [];
    const keys = createQueryKeys('probe', {
      get: (id: number) => ({
        queryKey: [id],
        queryFn: ({ queryKey }) => {
          seen.push(queryKey);
          return Promise.resolve(id * 2);
        },
      }),
    });

    await expect(client.fetchQuery(keys.get(21))).resolves.toBe(42);
    expect(seen).toEqual([['probe', 'get', 21]]);
    await expect(client.fetchQuery(todos.detail(2))).resolves.toMatchObject({ title: 'Ship it' });
    await expect(client.fetchQuery(todos.detail(2)._ctx.comments)).resolves.toHaveLength(1);
  });

  it('works for infinite queries with pageParam', async () => {
    const client = new QueryClient();
    const data = await client.fetchInfiniteQuery({ ...todos.feed({ status: 'all' }), pages: 2 });
    expect(data.pages.map((page) => page.items[0]?.id)).toEqual([1, 2]);
    expect(data.pageParams).toEqual([0, 1]);
  });
});

describe('createQueryKeyStore and mergeQueryKeys', () => {
  it('creates a store from one object', () => {
    const queries = createQueryKeyStore({
      users: null,
      todos: { detail: (id: number) => ({ queryKey: [id], queryFn: () => api.getTodo(id) }) },
    });
    expect(queries.users).toEqual({ _def: ['users'] });
    expect(queries.todos.detail(3).queryKey).toEqual(['todos', 'detail', 3]);
  });

  it('throws when merged scopes define the same entry twice', () => {
    const a = createQueryKeys('dup', { one: null });
    const b = createMutationKeys('dup', { one: null });
    expect(() => mergeQueryKeys(a, b)).toThrow(/"one" twice in scope "dup"/);
    expect(() => mergeQueryKeys(a, createQueryKeys('dup', { two: null }))).not.toThrow();
  });

  it('merges scopes by name, combining query and mutation scopes', () => {
    const queries = mergeQueryKeys(todos, users, todoMutations);
    expect(queries.users._def).toEqual(['users']);
    expect(queries.todos.detail(1).queryKey).toEqual(['todos', 'detail', 1]);
    expect(queries.todos.create.mutationKey).toEqual(['todos', 'create']);
  });
});

describe('createMutationKeys', () => {
  it('builds mutation keys and passes mutationFn through', async () => {
    expect(todoMutations._def).toEqual(['todos']);
    expect(todoMutations.create.mutationKey).toEqual(['todos', 'create']);
    expect(todoMutations.create.mutationFn).toBe(api.createTodo);
    expect(todoMutations.archive).toEqual({ _def: ['todos', 'archive'], mutationKey: ['todos', 'archive', 'bulk'] });
    expect(todoMutations.toggle._def).toEqual(['todos', 'toggle']);
    expect(todoMutations.toggle(5).mutationKey).toEqual(['todos', 'toggle', 5]);
    await expect(todoMutations.toggle(5).mutationFn(true)).resolves.toMatchObject({ id: 5, done: true });
  });

  it('supports contextMutations and a bare scope', () => {
    const m = createMutationKeys('m', {
      user: (id: string) => ({ mutationKey: [id], contextMutations: { avatar: null } }),
    });
    expect(m.user('a')._ctx.avatar.mutationKey).toEqual(['m', 'user', 'a', 'avatar']);
    expect(createMutationKeys('only')).toEqual({ _def: ['only'] });
  });
});
