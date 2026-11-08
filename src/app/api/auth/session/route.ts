import { NextResponse, type NextRequest } from "next/server";
import { logEvent, createSession, sessionTtl } from "@/lib/redis";
import { getRole } from "@/lib/supabase-admin";
import { clientIp, sameOrigin } from "@/lib/request";
import { ACCESS_COOKIE } from "@/lib/session-schema";
import { verifyAccessToken } from "@/lib/verify-token";

// Called by the login page right after Supabase signs the user in.
// We verify the token, look up the role, whitelist the session in Redis and set the cookie.

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { accessToken?: unknown } | null;
  const token = typeof body?.accessToken === "string" ? body.accessToken : "";

  const verified = await verifyAccessToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid login" }, { status: 401 });

  try {
    // The role comes from our own table, never from anything the client sent.
    const role = await getRole(verified.sub);

    // The Redis entry never outlives the token itself.
    const ttl = Math.min(sessionTtl(), verified.exp - Math.floor(Date.now() / 1000));
    if (ttl <= 0) return NextResponse.json({ error: "Invalid login" }, { status: 401 });

    await createSession({ sid: verified.sid, sub: verified.sub, role, ttl });
    await logEvent({ type: "login", sub: verified.sub, role, path: "/api/auth/session", ip: clientIp(req.headers) });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ACCESS_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ttl,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
