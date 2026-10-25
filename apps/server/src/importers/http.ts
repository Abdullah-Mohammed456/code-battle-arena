import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";

const directory = join(tmpdir(), "code-battle-imports");
let nextRequest = 0;
export async function sourceJson(url: string): Promise<unknown> {
  const file = join(
    directory,
    createHash("sha256").update(url).digest("hex") + ".json",
  );
  try {
    if (Date.now() - (await stat(file)).mtimeMs < 86400000)
      return JSON.parse(await readFile(file, "utf8"));
  } catch {
    /* A missing or invalid cache is fetched again. */
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = Math.max(0, nextRequest - Date.now());
    nextRequest = Date.now() + wait + 2100;
    await delay(wait);
    const response = await fetch(url, {
      headers: { "User-Agent": "CodeBattleArena/1.0 (problem import)" },
      signal: AbortSignal.timeout(30000),
      redirect: "error",
    });
    if (response.status === 429 || response.status >= 500) {
      await response.body?.cancel();
      if (attempt < 3) {
        await delay(2100 * 2 ** attempt);
        continue;
      }
    }
    if (!response.ok) throw new Error("Source request failed");
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 64 * 1024 * 1024)
          throw new Error("Source response too large");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const text = Buffer.concat(chunks).toString("utf8");
    const result = JSON.parse(text);
    if (
      new URL(url).hostname === "datasets-server.huggingface.co" &&
      Array.isArray(result.rows)
    )
      for (const item of result.rows) {
        delete item.row.solutions;
        delete item.row.incorrect_solutions;
      }
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(file, JSON.stringify(result), { mode: 0o600 });
    return result;
  }
  throw new Error("Source unavailable");
}
