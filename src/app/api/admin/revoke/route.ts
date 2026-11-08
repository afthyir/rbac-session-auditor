import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth";
import { logEvent, revokeAllSessions } from "@/lib/redis";
import { clientIp, sameOrigin } from "@/lib/request";
import { isUuid } from "@/lib/session-schema";

// Kicks a user out everywhere. Their next request fails the Redis whitelist check.

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const session = await authorize(req, "admin");
  if (session instanceof NextResponse) return session;

  const body = (await req.json().catch(() => null)) as { sub?: unknown } | null;
  if (!isUuid(body?.sub)) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

  const target = body.sub.toLowerCase();
  const count = await revokeAllSessions(target);
  await logEvent({
    type: "session_revoked",
    sub: session.sub,
    path: "/api/admin/revoke",
    ip: clientIp(req.headers),
    note: `Admin ${session.sub.slice(0, 8)} revoked ${count} session(s) for user ${target.slice(0, 8)}`,
  });

  return NextResponse.json({ revoked: count });
}
