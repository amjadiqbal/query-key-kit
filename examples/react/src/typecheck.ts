import { QueryClient, type QueryFunctionContext, useMutation, useQuery } from '@tanstack/react-query';
import { getScopeData } from '@amjadiqbal/query-key-kit';
import type { Filters, Todo } from './api';
import { type QueryKeys, queries, todos } from './queries';
const qc = new QueryClient();
const fromCache: Todo | undefined = qc.getQueryData(todos.detail(1).queryKey);
const lists: Array<[readonly unknown[], Todo[] | undefined]> = getScopeData(qc, todos.list);
export function useChecks() {
  const detail: Todo | undefined = useQuery(todos.detail(1)).data;
  const m = useMutation(queries.todos.setDone(1));
  m.mutate(true);
  // @ts-expect-error variables are boolean
  m.mutate('yes');
  return [detail, fromCache, lists];
}
export const fetchList = async (ctx: QueryFunctionContext<QueryKeys['todos']['list']['queryKey']>) => {
  const filters: Filters = ctx.queryKey[2].filters;
  return filters;
};
