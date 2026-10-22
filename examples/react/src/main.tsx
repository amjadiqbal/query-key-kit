import { QueryClient, QueryClientProvider, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelScope, getScopeData, invalidateScope, scopeKey, setScopeData } from '@amjadiqbal/query-key-kit';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { calls, type Todo } from './api';
import { queries, todos } from './queries';
const client = new QueryClient();
function Detail({ id }: { id: number }) {
  const todo = useQuery(todos.detail(id));
  const comments = useQuery(todos.detail(id)._ctx.comments);
  return (<section><h3>Detail <code>{JSON.stringify(todos.detail(id).queryKey)}</code></h3>
    <p>{todo.data ? `${todo.data.title} (${todo.data.done ? 'done' : 'open'})` : 'loading'}</p>
    <p>Comments key <code>{JSON.stringify(todos.detail(id)._ctx.comments.queryKey)}</code></p>
    <ul>{comments.data?.map((c) => <li key={c}>{c}</li>)}</ul></section>);
}
function List({ status }: { status: 'all' | 'open' | 'done' }) {
  const list = useQuery(todos.list({ status }));
  const qc = useQueryClient();
  const setDone = useMutation({
    ...queries.todos.setDone(1),
    onMutate: async (done) => { await cancelScope(qc, todos.list); setScopeData(qc, todos.list, (old) => old?.map((t: Todo) => (t.id === 1 ? { ...t, title: `${t.title} (saving)`, done } : t))); },
    onSettled: () => Promise.all([invalidateScope(qc, todos.list), invalidateScope(qc, todos.detail(1))]),
  });
  return (<section><h3>List {status} <code>{JSON.stringify(todos.list({ status }).queryKey)}</code></h3>
    <ul>{list.data?.map((t) => <li key={t.id}>{t.id}: {t.title} {t.done ? '✓' : ''}</li>)}</ul>
    {status === 'all' && <button type="button" onClick={() => setDone.mutate(!list.data?.find((t) => t.id === 1)?.done)}>Toggle todo 1 (mutationKey <code>{JSON.stringify(queries.todos.setDone(1).mutationKey)}</code>)</button>}</section>);
}
function Feed() {
  const feed = useInfiniteQuery(todos.feed());
  return (<section><h3>Infinite <code>{JSON.stringify(todos.feed().queryKey)}</code></h3>
    <p>{feed.data?.pages.flatMap((p) => p.items.map((t) => t.id)).join(', ')}</p>
    <button type="button" disabled={!feed.hasNextPage} onClick={() => feed.fetchNextPage()}>{feed.hasNextPage ? 'Load more' : 'No more pages'}</button></section>);
}
function Cache() {
  const qc = useQueryClient(); const [, force] = useState(0);
  const lists = getScopeData(qc, todos.list);
  return (<section><h3>Cache tools</h3>
    <button type="button" onClick={() => invalidateScope(qc, todos.list).then(() => force((n) => n + 1))}>invalidateScope(todos.list) <code>{JSON.stringify(scopeKey(todos.list))}</code></button>
    <button type="button" onClick={() => invalidateScope(qc, todos).then(() => force((n) => n + 1))}>invalidateScope(todos)</button>
    <button type="button" onClick={() => force((n) => n + 1)}>refresh view</button>
    <p>getScopeData(todos.list): {lists.map(([k, d]) => `${JSON.stringify(k)} → ${d?.length ?? 'none'} items`).join(' | ')}</p>
    <p>getQueryData(detail 1): {qc.getQueryData(todos.detail(1).queryKey)?.title ?? 'none'}</p>
    <p>API calls: {calls.join(', ')}</p></section>);
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><h1>query-key-kit React example</h1><Detail id={1} /><List status="all" /><List status="open" /><Feed /><Cache /></QueryClientProvider>);
