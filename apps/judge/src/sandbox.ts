import { createHash, randomUUID } from "node:crypto";
import { command, docker } from "./process.js";
import { env } from "./env.js";

export const ownerLabel = `arena.judge=${createHash("sha256").update(env.WORK_DIR).digest("hex").slice(0, 16)}`;
export const activeContainers = new Set<string>();
export const activeDirectories = new Set<string>();

export function sandboxArgs(name: string, memoryMb: number) {
  return [
    "--name",
    name,
    "--label",
    ownerLabel,
    "--network",
    "none",
    "--memory",
    `${memoryMb}m`,
    "--memory-swap",
    `${memoryMb}m`,
    "--cpus",
    "1",
    "--pids-limit",
    "64",
    "--read-only",
    "--tmpfs",
    "/work:rw,nosuid,nodev,size=64m,exec,mode=1777",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--user",
    "65534:65534",
    "--workdir",
    "/work",
    "--ulimit",
    "nofile=64:64",
    "--ulimit",
    "nproc=64:64",
    "--ulimit",
    "core=0",
    "--ulimit",
    "fsize=16777216:16777216",
    "--stop-timeout",
    "0",
  ];
}

export async function withSandbox<T>(run: (name: string) => Promise<T>) {
  const name = `sbx-${randomUUID()}`;
  activeContainers.add(name);
  try {
    return await run(name);
  } finally {
    try {
      const removed = await command(["rm", "-f", name]);
      if (removed.code !== 0 && !removed.stderr.includes("No such container")) {
        await docker(["rm", "-f", name]);
      }
    } finally {
      activeContainers.delete(name);
    }
  }
}

export async function containerState(
  name: string,
): Promise<{ OOMKilled: boolean; ExitCode: number; Running: boolean }> {
  return JSON.parse(
    await docker(["inspect", "--format", "{{json .State}}", name]),
  );
}

export async function ready() {
  await docker(["info", "--format", "{{.ServerVersion}}"]);
  await docker(["image", "inspect", env.RUNNER_IMAGE]);
}
