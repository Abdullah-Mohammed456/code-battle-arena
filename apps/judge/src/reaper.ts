import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { activeContainers, activeDirectories, ownerLabel } from "./sandbox.js";
import { docker } from "./process.js";
import { env } from "./env.js";

const staleMs = 30 * 60 * 1000;

export async function reap(now = Date.now()) {
  const names = (
    await docker([
      "ps",
      "-a",
      "--filter",
      `label=${ownerLabel}`,
      "--format",
      "{{.Names}}",
    ])
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  for (const name of names) {
    if (!/^sbx-[a-f0-9-]{36}$/.test(name) || activeContainers.has(name))
      continue;
    const created = Date.parse(
      (await docker(["inspect", "--format", "{{.Created}}", name])).trim(),
    );
    if (now - created > staleMs) await docker(["rm", "-f", name]);
  }
  let entries;
  try {
    entries = await readdir(env.WORK_DIR, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^job-[A-Za-z0-9]+$/.test(entry.name))
      continue;
    const path = join(env.WORK_DIR, entry.name);
    if (
      !activeDirectories.has(path) &&
      now - (await stat(path)).mtimeMs > staleMs
    )
      await rm(path, { recursive: true, force: true });
  }
}
