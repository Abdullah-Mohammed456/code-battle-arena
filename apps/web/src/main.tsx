import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { envSchema } from "./env";

envSchema.parse(import.meta.env);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main>
      <h1>Code Battle Arena</h1>
    </main>
  </StrictMode>,
);
