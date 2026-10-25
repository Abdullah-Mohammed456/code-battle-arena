import { webEnv } from "./env";

export type Api = <T>(
  path: string,
  schema: { parse(value: unknown): T },
  init?: RequestInit,
) => Promise<T>;

export function apiUrl(
  path: string,
  base = webEnv.VITE_API_URL,
  appHost = typeof window === "undefined"
    ? "localhost"
    : window.location.hostname,
) {
  if (!base) throw new Error("Problem service is temporarily unavailable.");
  const url = new URL(base);
  const localApp =
    !appHost ||
    appHost === "localhost" ||
    appHost.endsWith(".localhost") ||
    appHost === "127.0.0.1" ||
    appHost === "::1";
  const localHost =
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local") ||
    url.hostname.includes(":") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname);
  if (!localApp && (url.protocol !== "https:" || localHost))
    throw new Error("Problem service is temporarily unavailable.");
  return `${url.origin}${path}`;
}

export async function request<T>(
  path: string,
  schema: { parse(value: unknown): T },
  init?: RequestInit,
  token?: string | null,
): Promise<T> {
  const response = await fetch(apiUrl(path), {
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
