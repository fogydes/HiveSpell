// Shared test doubles for the Supabase client used by the data hooks.
//
// Our hooks talk to the Supabase client directly (no service wrappers), via
// either `supabase.rpc(name, params)` or the `supabase.from(table).select()…`
// query-builder chain, and — for friend invites — realtime `supabase.channel()`
// / `supabase.removeChannel()`. These helpers build stubs that mirror just
// enough of that surface for unit tests.
import { vi } from "vitest";

export interface QueryResult<T = unknown> {
  data: T | null;
  error: unknown;
}

// Every non-terminal builder method the hooks chain. Each returns the builder
// so calls compose; the builder itself is awaitable (see `then` below), so a
// chain that is `await`ed at any link resolves to the configured result.
const BUILDER_METHODS = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "or",
  "match",
  "is",
  "order",
  "limit",
  "range",
] as const;

/**
 * A chainable Supabase query-builder stub. Filter/query methods return the same
 * builder; the builder is thenable, so `await`ing the chain at any point
 * resolves to `result`. Terminal `.single()` / `.maybeSingle()` resolve to
 * `result` too. This matches how `@supabase/postgrest-js` behaves for the
 * read/write chains the hooks use.
 */
export function makeQueryBuilder<T = unknown>(
  result: QueryResult<T>,
): Record<string, unknown> {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  for (const method of BUILDER_METHODS) builder[method] = vi.fn(chain);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (
    onFulfilled?: ((value: QueryResult<T>) => unknown) | null,
    onRejected?: ((reason: unknown) => unknown) | null,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

/**
 * Stub of a Supabase realtime channel: `.on()` is chainable and `.subscribe()`
 * returns the channel. Assert subscription/teardown via the `channel` /
 * `removeChannel` mocks on the stubbed client rather than on the channel.
 */
export function makeChannelStub(): Record<string, unknown> {
  const channel: Record<string, unknown> = {};
  channel.on = vi.fn(() => channel);
  channel.subscribe = vi.fn(() => channel);
  channel.unsubscribe = vi.fn(() => Promise.resolve("ok"));
  return channel;
}
