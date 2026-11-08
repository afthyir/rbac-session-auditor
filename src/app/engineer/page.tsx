import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function Engineer() {
  const session = await requireRole("engineer");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Engineer area</h1>
      <p className="text-zinc-400">You're in as <span className="text-zinc-200">{session.role}</span>. Engineers and admins can see this page.</p>
      <Link className="text-sm underline" href="/dashboard">Back to dashboard</Link>
    </div>
  );
}
