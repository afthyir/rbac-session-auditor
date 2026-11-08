import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth";
import { logEvent, setRoleOnSessions } from "@/lib/redis";
import { clientIp, sameOrigin } from "@/lib/request";
import { isRole, isUuid } from "@/lib/session-schema";
import { setRole } from "@/lib/supabase-admin";

// Changes someone's role. It's saved in Supabase and pushed to their live sessions,
// so it takes effect on their very next request.

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const session = await authorize(req, "admin");
  if (session instanceof NextResponse) return session;

  const body = (await req.json().catch(() => null)) as { sub?: unknown; role?: unknown } | null;
  if (!isUuid(body?.sub) || !isRole(body?.role)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const target = body.sub.toLowerCase();
  // Stops an admin from locking themselves out by accident.
  if (target === session.sub) {
    return NextResponse.json({ error: "You can't change your own role" }, { status: 400 });
  }

  if (!(await setRole(target, body.role))) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const live = await setRoleOnSessions(target, body.role);

  await logEvent({
    type: "role_changed",
    sub: session.sub,
    path: "/api/admin/role",
    ip: clientIp(req.headers),
    note: `Admin ${session.sub.slice(0, 8)} set user ${target.slice(0, 8)} to ${body.role} (${live} live session(s) updated)`,
  });

  return NextResponse.json({ ok: true });
}
