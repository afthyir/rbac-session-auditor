import {
  AUDIT_MAX_LEN,
  KEYS,
  PROBE_WINDOW_SECONDS,
  parseSessionRecord,
  serializeAudit,
  type AuditEvent,
  type SessionRecord,
} from "./session-schema";

// Redis over HTTP, for the Edge middleware (Edge can't open TCP sockets).
// Locally this is the redis-rest container, in production it's Upstash.

export class RedisUnavailableError extends Error {
  constructor() {
    super("session store unavailable");
  }
}

type Command = ReadonlyArray<string | number>;

async function pipeline(commands: Command[]): Promise<unknown[]> {
  const url = process.env.REDIS_REST_URL;
  const token = process.env.REDIS_REST_TOKEN;
  if (!url || !token) throw new RedisUnavailableError();

  // Short timeout: this runs on every request, so a slow Redis shouldn't stall the site.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 400);

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new RedisUnavailableError();
    const body = (await res.json()) as Array<{ result?: unknown; error?: string }>;
    return body.map((r) => {
      if (r.error) throw new RedisUnavailableError();
      return r.result;
    });
  } catch {
    throw new RedisUnavailableError();
  } finally {
    clearTimeout(timer);
  }
}

export async function getSession(sid: string): Promise<SessionRecord | null> {
  const [raw] = await pipeline([["GET", KEYS.session(sid)]]);
  return parseSessionRecord(raw);
}

// Counts denied requests per IP. EXPIRE NX only sets the TTL on the first hit,
// so the window can't be stretched forever.
export async function recordProbe(ip: string): Promise<number> {
  const key = KEYS.probe(ip);
  const [count] = await pipeline([
    ["INCR", key],
    ["EXPIRE", key, PROBE_WINDOW_SECONDS, "NX"],
  ]);
  return typeof count === "number" ? count : 0;
}

// Best effort: a logging hiccup should never break a request.
export async function audit(event: AuditEvent): Promise<void> {
  try {
    await pipeline([
      ["LPUSH", KEYS.audit, serializeAudit(event)],
      ["LTRIM", KEYS.audit, 0, AUDIT_MAX_LEN - 1],
    ]);
  } catch {
    /* ignore */
  }
}
