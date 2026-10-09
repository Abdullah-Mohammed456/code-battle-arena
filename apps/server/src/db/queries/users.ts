import { createHash } from "node:crypto";
import type { UserProfile } from "@repo/shared";
import type { Database } from "../index.js";

export interface ClerkProfile {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
}
export function userStore(
  db: Database,
  profile: (id: string) => Promise<ClerkProfile>,
) {
  return async (clerkId: string): Promise<UserProfile> => {
    let user = await db.user.findUnique({ where: { clerkId } });
    if (!user) {
      const account = await profile(clerkId);
      const fallback = `user_${createHash("sha256").update(clerkId).digest("hex")}`;
      const values = {
        clerkId,
        displayName:
          [account.firstName, account.lastName].filter(Boolean).join(" ") ||
          account.username ||
          "Player",
        avatarUrl: account.imageUrl || null,
      };
      for (const handle of [account.username || fallback, fallback]) {
        try {
          user = await db.user.create({ data: { ...values, handle } });
        } catch (error) {
          if ((error as { code?: string }).code !== "P2002") throw error;
          user = await db.user.findUnique({ where: { clerkId } });
        }
        if (user) break;
      }
    }
    if (!user) throw new Error("User unavailable");
    return {
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      rating: user.rating,
      games: user.games,
      cfHandle: user.cfHandle,
      createdAt: user.createdAt.toISOString(),
    };
  };
}
