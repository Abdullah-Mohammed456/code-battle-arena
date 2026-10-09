import { expect, test } from "bun:test";
import { createQueue } from "./queue.js";

function deferred() {
  let resolve!: () => void;
  return {
    promise: new Promise<void>((done) => {
      resolve = done;
    }),
    release: () => resolve(),
  };
}

test("FIFO, concurrency limit and backpressure", async () => {
  const enqueue = createQueue(1, 2);
  const gate = deferred();
  const order: number[] = [];
  const first = enqueue(async () => {
    order.push(1);
    await gate.promise;
  });
  const second = enqueue(async () => {
    order.push(2);
  });
  const third = enqueue(async () => {
    order.push(3);
  });
  await expect(enqueue(async () => {})).rejects.toMatchObject({
    status: 503,
    code: "QUEUE_FULL",
  });
  expect(order).toEqual([1]);
  gate.release();
  await Promise.all([first, second, third]);
  expect(order).toEqual([1, 2, 3]);
});

test("cancellation frees a queued slot without starting its work", async () => {
  const enqueue = createQueue(1, 1);
  const gate = deferred();
  const first = enqueue(() => gate.promise);
  const abort = new AbortController();
  let ran = false;
  const waiting = enqueue(async () => {
    ran = true;
  }, abort.signal);
  abort.abort(new Error("disconnected"));
  await expect(waiting).rejects.toThrow("disconnected");
  const replacement = enqueue(async () => 42);
  gate.release();
  await first;
  expect(await replacement).toBe(42);
  expect(ran).toBe(false);
});

test("failed jobs release their slot", async () => {
  const enqueue = createQueue(1, 1);
  const first = enqueue(async () => {
    throw new Error("failed");
  });
  const next = enqueue(async () => 42);
  await expect(first).rejects.toThrow("failed");
  expect(await next).toBe(42);
});
