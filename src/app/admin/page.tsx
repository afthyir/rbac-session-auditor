import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAuditLog } from "@/lib/redis";
import { describeEvent } from "@/lib/session-schema";
import { AdminActions } from "./admin-actions";

export const dynamic = "force-dynamic";

export default async function Admin() {
  await requireRole("admin");
  const events = await getAuditLog(100);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <Link className="text-sm underline" href="/dashboard">Dashboard</Link>
      </div>

      <AdminActions />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Audit log</h2>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing logged yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 text-sm">
            {events.map((e, i) => (
              <li key={i} className="flex gap-4 px-4 py-2.5">
                <time className="w-40 shrink-0 text-zinc-500">{new Date(e.ts).toLocaleString("en-GB")}</time>
                <span>{describeEvent(e)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
