import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth";
import { getAuditLog } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const session = await authorize(req, "admin");
  if (session instanceof NextResponse) return session;

  const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;
  return NextResponse.json({ events: await getAuditLog(limit) });
}
