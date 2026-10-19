// Upstash Redis over its REST API, for features other than abandoned checkouts
// (lib/abandoned/store.ts keeps its own copy of this connection, deliberately
// left alone: it sits on the payment path). Same database, same variables.
//
// Writes go through the pipeline endpoint. Reads that a cached page renders
// go through the GET form (/<command>/<arg>/…) so Next can cache them by tag
// and an admin action can expire them; a POST is never cached.

/**
 * Vercel's Upstash integration has used several names, and lets the person
 * connecting it add a custom prefix (e.g. STORAGE_KV_REST_API_URL). Standard
 * names first, then any variable ending in one. The read-only token is
 * skipped: callers write.
 */
function envEndingIn(suffixes: string[]): string | undefined {
  for (const s of suffixes) if (process.env[s]) return process.env[s];
  for (const s of suffixes) {
    const key = Object.keys(process.env).find(
      (k) => k.endsWith(`_${s}`) && !k.includes("READ_ONLY") && process.env[k]
    );
    if (key) return process.env[key];
  }
  return undefined;
}
const URL_ = envEndingIn(["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"]);
const TOKEN = envEndingIn(["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"]);
const TIMEOUT_MS = 6_000;

export const redisConfigured = Boolean(URL_ && TOKEN);

export type Command = (string | number)[];

/** Several commands in one round trip, in order. Never cached. */
export async function redisPipeline(commands: Command[]): Promise<unknown[]> {
  if (!redisConfigured) throw new Error("Redis is not configured");
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands.map((c) => c.map(String))),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Redis answered ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(`Redis: ${failed.error}`);
  return out.map((r) => r.result);
}

/**
 * One read command, cacheable: pass the tags an admin action will expire and
 * how long the result may be served without one.
 */
export async function redisRead(
  command: Command,
  { tags, revalidate }: { tags: string[]; revalidate: number }
): Promise<unknown> {
  if (!redisConfigured) throw new Error("Redis is not configured");
  const path = command.map((part) => encodeURIComponent(String(part))).join("/");
  const res = await fetch(`${URL_}/${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    next: { tags, revalidate },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Redis answered ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string };
  if (out.error) throw new Error(`Redis: ${out.error}`);
  return out.result;
}
