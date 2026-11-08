import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function Engineer() {
  const session = await requireRole("engineer");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="eyebrow">Restricted</p>
        <h1 className="text-3xl font-semibold tracking-tight">Engineer area</h1>
      </div>
      <p className="text-muted">
        You&apos;re in as <span className="font-mono text-accent">{session.role}</span>. Engineers and
        admins can see this page.
      </p>
      <Link className="btn" href="/dashboard">Back to dashboard</Link>
    </div>
  );
}
