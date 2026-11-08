import { NextResponse, type NextRequest } from "next/server";
import { logEvent, revokeSession } from "@/lib/redis";
import { clientIp, sameOrigin } from "@/lib/request";
import { ACCESS_COOKIE } from "@/lib/session-schema";
import { verifyAccessToken } from "@/lib/verify-token";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const verified = token ? await verifyAccessToken(token) : null;

  if (verified) {
    try {
      await revokeSession(verified.sid);
      await logEvent({ type: "logout", sub: verified.sub, path: "/api/auth/logout", ip: clientIp(req.headers) });
    } catch {
      /* still clear the cookie below */
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ACCESS_COOKIE);
  return res;
}
