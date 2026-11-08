import { NextResponse } from "next/server";
import { redisHealthy } from "@/lib/redis";

export async function GET() {
  const ok = await redisHealthy();
  return NextResponse.json({ ok }, { status: ok ? 200 : 503 });
}
