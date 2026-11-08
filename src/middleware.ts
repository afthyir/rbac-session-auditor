import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/verify-token";
import { RedisUnavailableError, audit, getSession, recordProbe } from "@/lib/redis-edge";
import { clientIp } from "@/lib/request";
import {
  ACCESS_COOKIE,
  PROBE_MAX_ATTEMPTS,
  ROLE_RANK,
  isUuid,
  type AuditEvent,
  type Role,
} from "@/lib/session-schema";

// First line of defence. Every page and API request goes through here:
// clean the path -> check the token -> check the Redis whitelist -> check the role.
// Pages and API routes check again themselves (see lib/auth.ts).

const PUBLIC = new Set(["/", "/login", "/api/health", "/api/auth/session", "/api/auth/logout"]);

// Longest matching prefix wins. "hide" means answer 404 instead of 403,
// so outsiders can't tell whether /admin exists.
const RULES: { prefix: string; min: Role; hide: boolean }[] = [
  { prefix: "/api/admin", min: "admin", hide: true },
  { prefix: "/admin", min: "admin", hide: true },
  { prefix: "/api/engineer", min: "engineer", hide: true },
  { prefix: "/engineer", min: "engineer", hide: true },
  { prefix: "/api/users", min: "guest", hide: false },
  { prefix: "/dashboard", min: "guest", hide: false },
];

// Anything not listed above still needs a login.
const FALLBACK = { prefix: "", min: "guest" as Role, hide: false };

const IDENTITY_HEADERS = ["x-auth-sub", "x-auth-sid", "x-auth-role"];

function cleanPath(raw: string): string | null {
  let p: string;
  try {
    p = decodeURIComponent(raw);
  } catch {
    return null;
  }
  // Double encoding, NUL bytes, backslashes and ../ are all ways to trick a router.
  if (/[%\0\\]/.test(p) || p.includes("//") || p.length > 512) return null;
  if (p.split("/").some((s) => s === ".." || s === ".")) return null;
  return p.length > 1 ? p.replace(/\/$/, "").toLowerCase() : p;
}

function ruleFor(path: string) {
  let best = FALLBACK;
  for (const r of RULES) {
    const hit = path === r.prefix || path.startsWith(r.prefix + "/");
    if (hit && r.prefix.length > best.prefix.length) best = r;
  }
  return best;
}

const noStore = (res: NextResponse) => {
  res.headers.set("Cache-Control", "private, no-store");
  return res;
};

const fail = (status: number, error: string, headers?: HeadersInit) =>
  noStore(NextResponse.json({ error }, { status, headers }));

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const rawPath = req.nextUrl.pathname;
  const isApi = rawPath === "/api" || rawPath.startsWith("/api/");
  const ip = clientIp(req.headers);

  // Log the denial, count it against the IP, then answer.
  async function deny(
    event: Pick<AuditEvent, "type" | "sub" | "role">,
    status: 401 | 403 | 404,
  ): Promise<NextResponse> {
    let count = 0;
    try {
      count = await recordProbe(ip);
    } catch {
      /* Redis down: still deny */
    }
    const limited = count > PROBE_MAX_ATTEMPTS;
    ev.waitUntil(audit({ ...event, type: limited ? "probe_rate_limited" : event.type, path: rawPath, ip }));

    if (limited) return fail(429, "Too many requests", { "Retry-After": "300" });
    if (status === 401 && !isApi) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return noStore(NextResponse.redirect(url, 307));
    }
    return fail(status, status === 404 ? "Not found" : status === 401 ? "Unauthorized" : "Forbidden");
  }

  const path = cleanPath(rawPath);
  if (!path) return deny({ type: "malformed_path" }, 404);
  if (PUBLIC.has(path)) return NextResponse.next();

  const rule = ruleFor(path);
  const hiddenOr = (status: 401 | 403) => (rule.hide ? 404 : status);

  // Browsers send the cookie; API clients can use a Bearer header.
  let token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token && isApi) {
    const h = req.headers.get("authorization");
    if (h?.slice(0, 7).toLowerCase() === "bearer ") token = h.slice(7).trim();
  }
  if (!token) return deny({ type: "no_token" }, hiddenOr(401));

  // 1. Is the token genuine and unexpired?
  const verified = await verifyAccessToken(token);
  if (!verified) return deny({ type: "invalid_token" }, hiddenOr(401));

  // 2. Is the session still whitelisted? A valid JWT isn't enough, revoked sessions fail here.
  let session;
  try {
    session = await getSession(verified.sid);
  } catch (err) {
    // If we can't check the whitelist, nobody gets in.
    if (err instanceof RedisUnavailableError) return fail(503, "Service unavailable", { "Retry-After": "5" });
    return fail(500, "Something went wrong");
  }
  if (!session) return deny({ type: "session_not_whitelisted", sub: verified.sub }, hiddenOr(401));
  if (session.sub !== verified.sub) return deny({ type: "session_subject_mismatch", sub: verified.sub }, 401);

  // 3. Does the role (read from Redis, not the token) allow this route?
  if (ROLE_RANK[session.role] < ROLE_RANK[rule.min]) {
    return deny({ type: "role_denied", sub: session.sub, role: session.role }, hiddenOr(403));
  }

  // 4. Object-level check for /api/users/:id. You can only ask about yourself unless you're admin.
  // "Not yours" and "doesn't exist" both look the same from outside (404).
  const match = /^\/api\/users\/([^/]+)/.exec(path);
  if (match) {
    const target = match[1];
    if (!isUuid(target) || (target !== session.sub && session.role !== "admin")) {
      return deny({ type: "bola_blocked", sub: session.sub, role: session.role }, 404);
    }
  }

  // Pass the verified identity downstream. Strip anything the client sent first,
  // otherwise someone could just send "x-auth-role: admin".
  const headers = new Headers(req.headers);
  for (const h of IDENTITY_HEADERS) headers.delete(h);
  headers.set("x-auth-sub", session.sub);
  headers.set("x-auth-sid", verified.sid);
  headers.set("x-auth-role", session.role);

  return noStore(NextResponse.next({ request: { headers } }));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|map)$).*)"],
};
