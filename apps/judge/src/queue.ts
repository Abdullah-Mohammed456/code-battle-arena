import { JudgeError } from "./errors.js";

export function createQueue(concurrency: number, capacity: number) {
  let active = 0;
  const pending: { start: () => void; cancel: () => void }[] = [];
  function drain() {
    while (active < concurrency && pending.length) pending.shift()!.start();
  }
  return function enqueue<T>(
    run: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    signal?.throwIfAborted();
    if (active >= concurrency && pending.length >= capacity) {
      return Promise.reject(
        new JudgeError(503, "QUEUE_FULL", "Execution queue is full"),
      );
    }
    return new Promise((resolve, reject) => {
      const job = {
        start() {
          signal?.removeEventListener("abort", job.cancel);
          active++;
          Promise.resolve()
            .then(() => {
              signal?.throwIfAborted();
              return run();
            })
            .then(resolve, reject)
            .finally(() => {
              active--;
              drain();
            });
        },
        cancel() {
          const index = pending.indexOf(job);
          if (index !== -1) pending.splice(index, 1);
          reject(signal?.reason);
        },
      };
      if (active < concurrency) job.start();
      else {
        pending.push(job);
        signal?.addEventListener("abort", job.cancel, { once: true });
      }
    });
  };
}
