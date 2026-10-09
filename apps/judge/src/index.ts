import { app } from "./app.js";
import { env } from "./env.js";
import { reap } from "./reaper.js";

let cleaning = false;
async function cleanup() {
  if (cleaning) return;
  cleaning = true;
  try {
    await reap();
  } catch {
    console.error("Judge cleanup failed");
  } finally {
    cleaning = false;
  }
}
await cleanup();
const reaper = setInterval(cleanup, 60000);
reaper.unref();

app.listen(env.PORT, "127.0.0.1", () => {
  console.log(`judge listening on http://localhost:${env.PORT}`);
});
