import "server-only";
import Redis from "ioredis";
import {
  AUDIT_MAX_LEN,
  KEYS,
  parseAudit,
  parseSessionRecord,
  serializeAudit,
  type AuditEvent,
  type Role,
  type SessionRecord,
  type StoredAuditEvent,
} from "./session-schema";
import { verifyAccessToken } from "./verify-token";

// Redis over TCP for route handlers and server components.
// (The Edge middleware has its own HTTP client in redis-edge.ts.)

const MAX_TTL = 86_400;

export function sessionTtl(): number {
  const n = Number(process.env.SESSION_TTL_SECONDS);
  return Number.isInteger(n) && n > 0 && n <= MAX_TTL ? n : 3600;
}

// Keep one connection alive across hot reloads in dev.
const g = globalThis as unknown as { __redis?: Redis };

export function getRedis(): Redis {
  if (g.__redis) return g.__redis;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not set");

  const client = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 2000,
    commandTimeout: 1500,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false, // fail fast when Redis is down
    retryStrategy: (n) => Math.min(n * 200, 3000),
    ...(url.startsWith("rediss://") ? { tls: {} } : {}),
  });

  // Log the error code only; full errors can contain connection details.
  client.on("error", (e: NodeJS.ErrnoException) => console.error(`[redis] ${e.code ?? "error"}`));

  g.__redis = client;
  return client;
}

async function ready(): Promise<Redis> {
  const client = getRedis();
  if (client.status === "wait" || client.status === "end") await client.connect();
  return client;
}

export async function redisHealthy(): Promise<boolean> {
  try {
    return (await (await ready()).ping()) === "PONG";
  } catch {
    return false;
  }
}

// ---- Sessions -----------------------------------------------------------

export async function createSession(input: {
  sid: string;
  sub: string;
  role: Role;
  ttl: number;
}): Promise<void> {
  const redis = await ready();
  const record: SessionRecord = {
    sub: input.sub.toLowerCase(),
    role: input.role,
    issuedAt: Math.floor(Date.now() / 1000),
  };
  await redis
    .multi()
    .set(KEYS.session(input.sid), JSON.stringify(record), "EX", input.ttl)
    .sadd(KEYS.userSessions(input.sub), input.sid.toLowerCase())
    .expire(KEYS.userSessions(input.sub), MAX_TTL)
    .exec();
}

export async function revokeSession(sid: string): Promise<void> {
  await (await ready()).del(KEYS.session(sid));
}

export async function revokeAllSessions(sub: string): Promise<number> {
  const redis = await ready();
  const setKey = KEYS.userSessions(sub);
  const sids = await redis.smembers(setKey);
  const tx = redis.multi();
  for (const sid of sids) tx.del(KEYS.session(sid));
  tx.del(setKey);
  await tx.exec();
  return sids.length;
}

// Changes the role on every live session of a user. KEEPTTL so it doesn't extend the session.
export async function setRoleOnSessions(sub: string, role: Role): Promise<number> {
  const redis = await ready();
  const sids = await redis.smembers(KEYS.userSessions(sub));
  let updated = 0;
  for (const sid of sids) {
    const key = KEYS.session(sid);
    const current = parseSessionRecord(await redis.get(key));
    if (!current) continue;
    await redis.set(key, JSON.stringify({ ...current, role }), "KEEPTTL");
    updated++;
  }
  return updated;
}

// Full check for route handlers: signature, then whitelist, then "does this session belong to this user".
export async function validateSession(token: string) {
  const verified = await verifyAccessToken(token);
  if (!verified) return null;

  const record = parseSessionRecord(await (await ready()).get(KEYS.session(verified.sid)));
  if (!record || record.sub !== verified.sub) return null;

  return { sub: record.sub, sid: verified.sid, role: record.role };
}

// ---- Audit log ----------------------------------------------------------

export async function logEvent(event: AuditEvent): Promise<void> {
  try {
    await (await ready())
      .multi()
      .lpush(KEYS.audit, serializeAudit(event))
      .ltrim(KEYS.audit, 0, AUDIT_MAX_LEN - 1)
      .exec();
  } catch {
    /* ignore */
  }
}

export async function getAuditLog(limit = 50): Promise<StoredAuditEvent[]> {
  const rows = await (await ready()).lrange(KEYS.audit, 0, Math.min(limit, 200) - 1);
  return rows.map(parseAudit).filter((e): e is StoredAuditEvent => e !== null);
}
