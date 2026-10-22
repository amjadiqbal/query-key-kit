export type Todo = { id: number; title: string; done: boolean };
export type Page = { items: Todo[]; nextCursor: number | null };
export type Filters = { status: 'all' | 'open' | 'done' };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const calls: string[] = [];
let todos: Todo[] = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, title: `Todo ${i + 1}`, done: i % 3 === 0 }));
export const api = {
  async getTodo(id: number) { calls.push(`getTodo(${id})`); await wait(150); return todos.find((t) => t.id === id)!; },
  async getTodos(f: Filters) { calls.push(`getTodos(${f.status})`); await wait(150); return todos.filter((t) => f.status === 'all' || t.done === (f.status === 'done')); },
  async getComments(id: number) { calls.push(`getComments(${id})`); await wait(150); return [`First comment on ${id}`, `Second comment on ${id}`]; },
  async getPage(cursor: number): Promise<Page> { calls.push(`getPage(${cursor})`); await wait(150); return { items: todos.slice(cursor, cursor + 3), nextCursor: cursor + 3 < todos.length ? cursor + 3 : null }; },
  async setDone(id: number, done: boolean) { calls.push(`setDone(${id},${done})`); await wait(800); todos = todos.map((t) => (t.id === id ? { ...t, done } : t)); return todos.find((t) => t.id === id)!; },
};
