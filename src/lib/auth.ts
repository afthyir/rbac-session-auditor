import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { validateSession } from "./redis";
import { ACCESS_COOKIE, ROLE_RANK, type Role } from "./session-schema";

// The middleware already checked this request. We check again here on purpose:
// if the middleware is ever misconfigured or bypassed, the pages and APIs still say no.

export type Session = NonNullable<Awaited<ReturnType<typeof validateSession>>>;

// For pages (server components).
export async function requireRole(min: Role): Promise<Session> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  const session = token ? await validateSession(token) : null;
  if (!session) redirect("/login");
  if (ROLE_RANK[session.role] < ROLE_RANK[min]) notFound();
  return session;
}

// For API routes. Returns the session, or a ready-made error response.
export async function authorize(req: NextRequest, min: Role): Promise<Session | NextResponse> {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const session = token ? await validateSession(token).catch(() => null) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ROLE_RANK[session.role] < ROLE_RANK[min]) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}
