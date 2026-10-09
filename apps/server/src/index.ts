import { app } from "./app.js";
import { env } from "./env.js";

app.listen(env.PORT, () => {
  console.log(`server listening on http://localhost:${env.PORT}`);
});
