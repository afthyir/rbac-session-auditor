import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { SignOutButton } from "@/components/nav";

export default async function Dashboard() {
  const session = await requireRole("guest");

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <p className="eyebrow">Signed in</p>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <SignOutButton />
      </div>

      <dl className="card divide-y divide-line text-sm">
        <div className="flex justify-between gap-4 pb-3">
          <dt className="text-muted">User</dt>
          <dd className="break-all font-mono">{session.sub}</dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-muted">Role</dt>
          <dd className="font-mono">{session.role}</dd>
        </div>
        <div className="flex justify-between gap-4 pt-3">
          <dt className="text-muted">Session</dt>
          <dd className="font-mono">{session.sid.slice(0, 8)}…</dd>
        </div>
      </dl>

      <p className="text-sm text-muted">
        Try <Link className="text-accent underline" href="/engineer">/engineer</Link> or{" "}
        <Link className="text-accent underline" href="/admin">/admin</Link>. Without the role you get a
        404, and the attempt is logged.
      </p>
    </div>
  );
}
