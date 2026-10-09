import { app } from "./app.js";
import { env } from "./env.js";

const server = app.listen(env.PORT, () =>
  console.log(`server listening on http://localhost:${env.PORT}`),
);
server.headersTimeout = 10000;
server.requestTimeout = 30000;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    server.close(() => {
      void app.locals.shutdown().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
