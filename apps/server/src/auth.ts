import { clerkMiddleware, createClerkClient, getAuth } from "@clerk/express";
import type { RequestHandler, Request } from "express";
import type { Env } from "./env.js";
import type { ClerkProfile } from "./db/queries/users.js";
import { ApiError } from "./errors.js";

export function authentication(config: Env) {
  const configured = !!config.CLERK_SECRET_KEY;
  const middleware: RequestHandler = configured
    ? clerkMiddleware({
        secretKey: config.CLERK_SECRET_KEY,
        publishableKey: config.CLERK_PUBLISHABLE_KEY,
        jwtKey: config.CLERK_JWT_KEY,
        authorizedParties: config.CORS_ORIGINS,
      })
    : (_req, _res, next) => next();
  return {
    middleware,
    userId(req: Request) {
      if (!configured) {
        if (!req.get("authorization"))
          throw new ApiError(401, "UNAUTHORIZED", "Sign in required");
        throw new ApiError(
          503,
          "AUTH_UNAVAILABLE",
          "Authentication unavailable",
        );
      }
      const { userId } = getAuth(req);
      if (!userId) throw new ApiError(401, "UNAUTHORIZED", "Sign in required");
      return userId;
    },
    async profile(id: string): Promise<ClerkProfile> {
      if (!configured)
        throw new ApiError(
          503,
          "AUTH_UNAVAILABLE",
          "Authentication unavailable",
        );
      try {
        return await createClerkClient({
          secretKey: config.CLERK_SECRET_KEY,
        }).users.getUser(id);
      } catch {
        throw new ApiError(
          503,
          "AUTH_UNAVAILABLE",
          "Authentication unavailable",
        );
      }
    },
  };
}
