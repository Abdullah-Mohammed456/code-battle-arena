import { webEnv } from "./env";

export type Api = <T>(
  path: string,
  schema: { parse(value: unknown): T },
  init?: RequestInit,
) => Promise<T>;

export async function request<T>(
  path: string,
  schema: { parse(value: unknown): T },
  init?: RequestInit,
  token?: string | null,
): Promise<T> {
  const response = await fetch(`${webEnv.VITE_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      body?.error?.message ?? `Request failed (${response.status})`,
    );
  }
  return schema.parse(await response.json());
}
