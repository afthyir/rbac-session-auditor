import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth";
import { isUuid } from "@/lib/session-schema";
import { getProfile } from "@/lib/supabase-admin";

// Example of an object-level check (BOLA / IDOR).
// Being logged in isn't enough: you can only read your own profile unless you're an admin.

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authorize(req, "guest");
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const notFound = NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isUuid(id)) return notFound;
  if (id.toLowerCase() !== session.sub && session.role !== "admin") return notFound;

  const profile = await getProfile(id.toLowerCase());
  return profile ? NextResponse.json(profile) : notFound;
}
