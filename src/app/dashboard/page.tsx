import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { SignOutButton } from "@/components/nav";

export default async function Dashboard() {
  const session = await requireRole("guest");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <SignOutButton />
      </div>

      <dl className="space-y-2 rounded-xl border border-zinc-800 p-4 text-sm">
        <div className="flex justify-between"><dt className="text-zinc-500">User</dt><dd className="font-mono">{session.sub}</dd></div>
        <div className="flex justify-between"><dt className="text-zinc-500">Role</dt><dd>{session.role}</dd></div>
        <div className="flex justify-between"><dt className="text-zinc-500">Session</dt><dd className="font-mono">{session.sid.slice(0, 8)}…</dd></div>
      </dl>

      <p className="text-sm text-zinc-500">
        Try <Link className="underline" href="/engineer">/engineer</Link> or{" "}
        <Link className="underline" href="/admin">/admin</Link>. Without the role you'll get a 404, and the attempt is logged.
      </p>
    </div>
  );
}
