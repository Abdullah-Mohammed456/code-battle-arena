import { spawn } from "node:child_process";
import { JudgeError } from "./errors.js";

export interface ProcessResult {
  code: number | null;
  stdout: string;
  stdoutBuffer: Buffer;
  stderr: string;
  timedOut: boolean;
  overflow: boolean;
}

export function command(
  args: string[],
  options: {
    timeout?: number;
    input?: string;
    maxOutput?: number;
    signal?: AbortSignal;
  } = {},
): Promise<ProcessResult> {
  options.signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let size = 0;
    let timedOut = false;
    let overflow = false;
    const abort = () => child.kill("SIGKILL");
    const timer = setTimeout(() => {
      timedOut = true;
      abort();
    }, options.timeout ?? 5000);
    options.signal?.addEventListener("abort", abort, { once: true });
    const capture = (target: Buffer[]) => (chunk: Buffer) => {
      const remaining = Math.max(0, (options.maxOutput ?? 65536) - size);
      target.push(chunk.subarray(0, remaining));
      size += chunk.length;
      if (size > (options.maxOutput ?? 65536)) {
        overflow = true;
        abort();
      }
    };
    child.stdout.on("data", capture(stdout));
    child.stderr.on("data", capture(stderr));
    child.stdin.on("error", () => {});
    child.stdin.end(options.input);
    child.once("error", () => {
      reject(
        new JudgeError(
          503,
          "JUDGE_UNAVAILABLE",
          "Execution service unavailable",
        ),
      );
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      if (options.signal?.aborted) return reject(options.signal.reason);
      resolve({
        code,
        stdout: Buffer.concat(stdout).toString(),
        stdoutBuffer: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr).toString(),
        timedOut,
        overflow,
      });
    });
  });
}

export async function docker(args: string[]) {
  const result = await command(args);
  if (result.code !== 0 || result.timedOut || result.overflow) {
    throw new JudgeError(
      503,
      "JUDGE_UNAVAILABLE",
      "Execution service unavailable",
    );
  }
  return result.stdout;
}
