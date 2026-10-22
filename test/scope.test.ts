import { QueryClient } from '@tanstack/query-core';
import { beforeEach, describe, expect, it } from 'vitest';
import { cancelScope, getScopeData, invalidateScope, refetchScope, removeScope, scopeKey, setScopeData } from '../src';
import { type Todo, todoMutations, todos } from './fixtures';

let client: QueryClient;

beforeEach(async () => {
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } } });
  await client.prefetchQuery(todos.detail(1));
  await client.prefetchQuery(todos.detail(2));
  await client.prefetchQuery(todos.detail(1)._ctx.comments);
  await client.prefetchQuery(todos.list({ status: 'all' }));
  await client.prefetchQuery(todos.list({ status: 'open' }));
});

const invalidated = () =>
  client
    .getQueryCache()
    .getAll()
    .filter((query) => query.state.isInvalidated)
    .map((query) => query.queryKey);

describe('scopeKey', () => {
  it('uses _def for scopes and function entries, the key for everything else', () => {
    expect(scopeKey(todos)).toEqual(['todos']);
    expect(scopeKey(todos.detail)).toEqual(['todos', 'detail']);
    expect(scopeKey(todos.detail(1))).toEqual(['todos', 'detail', 1]);
    expect(scopeKey(todos.count)).toEqual(['todos', 'count', 'total']);
    expect(scopeKey(todos.detail(1)._ctx.comments)).toEqual(['todos', 'detail', 1, 'comments']);
  });

  it('throws for mutation entries instead of using their key as a query filter', () => {
    // @ts-expect-error mutation entries are rejected at compile time too
    expect(() => scopeKey(todoMutations.toggle(3))).toThrow(/mutation/);
  });
});

describe('invalidateScope', () => {
  it('invalidates one entry and its context queries only', async () => {
    await invalidateScope(client, todos.detail(1));
    expect(invalidated()).toEqual([
      ['todos', 'detail', 1],
      ['todos', 'detail', 1, 'comments'],
    ]);
  });

  it('invalidates every call of a function entry', async () => {
    await invalidateScope(client, todos.list);
    expect(invalidated()).toEqual([
      ['todos', 'list', { filters: { status: 'all' } }],
      ['todos', 'list', { filters: { status: 'open' } }],
    ]);
  });

  it('merges extra filters such as exact', async () => {
    await invalidateScope(client, todos.detail(1), { exact: true });
    expect(invalidated()).toEqual([['todos', 'detail', 1]]);
  });

  it('invalidates a whole scope', async () => {
    await invalidateScope(client, todos);
    expect(invalidated()).toHaveLength(5);
  });
});

describe('getScopeData and setScopeData', () => {
  it('reads every cached query under a node', () => {
    const lists = getScopeData(client, todos.list);
    expect(lists.map(([key]) => key)).toEqual([
      ['todos', 'list', { filters: { status: 'all' } }],
      ['todos', 'list', { filters: { status: 'open' } }],
    ]);
    expect(lists[0]?.[1]).toHaveLength(2);
  });

  it('updates every cached list at once', () => {
    setScopeData(client, todos.list, (old) => old?.map((todo: Todo) => ({ ...todo, done: true })));
    for (const [, data] of getScopeData(client, todos.list)) {
      expect(data?.every((todo) => todo.done)).toBe(true);
    }
    expect(client.getQueryData(todos.detail(2).queryKey)?.done).toBe(false);
  });
});

describe('removeScope, cancelScope and refetchScope', () => {
  it('removes queries under a node', () => {
    removeScope(client, todos.detail);
    expect(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey),
    ).toEqual([
      ['todos', 'list', { filters: { status: 'all' } }],
      ['todos', 'list', { filters: { status: 'open' } }],
    ]);
  });

  it('cancels and refetches through the client', async () => {
    await expect(cancelScope(client, todos.detail)).resolves.toBeUndefined();
    client.setQueryData(todos.detail(1).queryKey, (todo) => (todo ? { ...todo, title: 'stale' } : todo));
    await refetchScope(client, todos.detail(1), { exact: true });
    expect(client.getQueryData(todos.detail(1).queryKey)?.title).toBe('Write tests');
  });
});
