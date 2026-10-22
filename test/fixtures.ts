import { createMutationKeys, createQueryKeys } from '../src';

export type Todo = { id: number; title: string; done: boolean };
export type Comment = { id: number; todoId: number; body: string };
export type TodoFilters = { status: 'all' | 'open' | 'done' };
export type TodoPage = { items: Todo[]; nextCursor: number | null };

export const db: Todo[] = [
  { id: 1, title: 'Write tests', done: true },
  { id: 2, title: 'Ship it', done: false },
];

export const api = {
  getTodo: async (id: number): Promise<Todo> => db.find((todo) => todo.id === id) as Todo,
  getTodos: async (filters: TodoFilters): Promise<Todo[]> =>
    db.filter((todo) => filters.status === 'all' || todo.done === (filters.status === 'done')),
  getComments: async (todoId: number): Promise<Comment[]> => [{ id: 1, todoId, body: 'Nice' }],
  getPage: async (cursor: number): Promise<TodoPage> => ({
    items: db.slice(cursor, cursor + 1),
    nextCursor: cursor + 1 < db.length ? cursor + 1 : null,
  }),
  createTodo: async (input: { title: string }): Promise<Todo> => ({ id: 3, title: input.title, done: false }),
};

export const todos = createQueryKeys('todos', {
  all: null,
  count: ['total'],
  stats: { queryKey: null, queryFn: () => Promise.resolve({ open: 1, done: 1 }), staleTime: 60_000 },
  detail: (id: number) => ({
    queryKey: [id],
    queryFn: () => api.getTodo(id),
    contextQueries: {
      comments: { queryKey: null, queryFn: () => api.getComments(id) },
    },
  }),
  list: (filters: TodoFilters) => ({
    queryKey: [{ filters }],
    queryFn: () => api.getTodos(filters),
    placeholderData: [] as Todo[],
  }),
  search: (term: string) => [term],
  feed: (filters: TodoFilters) => ({
    queryKey: [filters],
    queryFn: ({ pageParam }: { pageParam: number }) => api.getPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last: TodoPage) => last.nextCursor,
  }),
});

export const users = createQueryKeys('users');

export const todoMutations = createMutationKeys('todos', {
  create: { mutationKey: null, mutationFn: api.createTodo },
  toggle: (id: number) => ({
    mutationKey: [id],
    mutationFn: (done: boolean) => Promise.resolve({ ...(db[0] as Todo), id, done }),
  }),
  archive: ['bulk'],
});
