import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { envSchema } from "./env";
import { ProblemPreview } from "./ProblemPreview";

envSchema.parse(import.meta.env);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProblemPreview />
  </StrictMode>,
);
