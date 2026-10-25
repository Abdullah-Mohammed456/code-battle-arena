import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { webEnv } from "./env";
import { App } from "./app";
import { clerkAppearance } from "./clerkAppearance";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {webEnv.VITE_CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider
            publishableKey={webEnv.VITE_CLERK_PUBLISHABLE_KEY}
            appearance={clerkAppearance}
            localization={{
              signIn: { start: { title: "Sign in to Code Battle Arena" } },
              signUp: {
                start: { title: "Create your Code Battle Arena account" },
              },
            }}
          >
            <App />
          </ClerkProvider>
        ) : (
          <App />
        )}
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
