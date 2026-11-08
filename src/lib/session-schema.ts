// Shared types and helpers. No Node-only imports, so the Edge middleware can use this too.

export const ROLES = ["guest", "engineer", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = { guest: 1, engineer: 2, admin: 3 };

export const ACCESS_COOKIE = "sb-access-token";

export const isRole = (v: unknown): v is Role =>
  typeof v === "string" && (ROLES as readonly string[]).includes(v);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

// What we keep in Redis per session. The role lives here (not only in the JWT)
// so it can be changed or revoked instantly.
export interface SessionRecord {
  sub: string;
  role: Role;
  issuedAt: number;
}

export function parseSessionRecord(raw: unknown): SessionRecord | null {
  if (typeof raw !== "string") return null;
  try {
    const v = JSON.parse(raw) as Partial<SessionRecord>;
    if (!isUuid(v.sub) || !isRole(v.role) || typeof v.issuedAt !== "number") return null;
    return { sub: v.sub, role: v.role, issuedAt: v.issuedAt };
  } catch {
    return null;
  }
}

// Ids are validated before they go into a key, so user input can't smuggle in extra key segments.
export const KEYS = {
  session(sid: string) {
    if (!isUuid(sid)) throw new Error("invalid session id");
    return `sess:${sid.toLowerCase()}`;
  },
  userSessions(sub: string) {
    if (!isUuid(sub)) throw new Error("invalid user id");
    return `usess:${sub.toLowerCase()}`;
  },
  probe(ip: string) {
    return `probe:${/^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : "unknown"}`;
  },
  audit: "audit:security",
} as const;

export const PROBE_WINDOW_SECONDS = 300;
export const PROBE_MAX_ATTEMPTS = 20;
export const AUDIT_MAX_LEN = 5000;

// ---- Audit log ----------------------------------------------------------

export type AuditType =
  | "login"
  | "logout"
  | "session_revoked"
  | "role_changed"
  | "no_token"
  | "invalid_token"
  | "session_not_whitelisted"
  | "session_subject_mismatch"
  | "role_denied"
  | "bola_blocked"
  | "malformed_path"
  | "probe_rate_limited";

export interface AuditEvent {
  type: AuditType;
  path: string;
  ip: string;
  sub?: string;
  role?: string;
  note?: string;
}

export type StoredAuditEvent = AuditEvent & { ts: number };

export function serializeAudit(e: AuditEvent): string {
  return JSON.stringify({
    ...e,
    path: e.path.slice(0, 200),
    note: e.note?.slice(0, 200),
    ts: Date.now(),
  });
}

export function parseAudit(raw: string): StoredAuditEvent | null {
  try {
    const v = JSON.parse(raw) as StoredAuditEvent;
    return typeof v.type === "string" && typeof v.ts === "number" ? v : null;
  } catch {
    return null;
  }
}

// Turns an event into a sentence for the admin panel.
export function describeEvent(e: StoredAuditEvent): string {
  const who = e.sub ? `User ${e.sub.slice(0, 8)}` : "Anonymous visitor";
  switch (e.type) {
    case "login":
      return `${who} signed in from ${e.ip}`;
    case "logout":
      return `${who} signed out`;
    case "role_denied":
      return `${who} (${e.role}) tried to open ${e.path} from ${e.ip} - access denied`;
    case "no_token":
      return `${who} tried to open ${e.path} from ${e.ip} without a session - access denied`;
    case "invalid_token":
      return `${who} sent an invalid token to ${e.path} from ${e.ip} - access denied`;
    case "session_not_whitelisted":
      return `${who} used a revoked or expired session on ${e.path} from ${e.ip} - access denied`;
    case "session_subject_mismatch":
      return `${who} sent a token that doesn't match its session (${e.path}, ${e.ip}) - access denied`;
    case "bola_blocked":
      return `${who} tried to read another user's data at ${e.path} from ${e.ip} - blocked`;
    case "malformed_path":
      return `${e.ip} sent a malformed path - rejected`;
    case "probe_rate_limited":
      return `${e.ip} was rate limited after repeated denied requests`;
    case "session_revoked":
    case "role_changed":
      return e.note ?? e.type;
  }
}
