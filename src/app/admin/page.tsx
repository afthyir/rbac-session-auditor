import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAuditLog } from "@/lib/redis";
import { describeEvent, type AuditType } from "@/lib/session-schema";
import { AdminActions } from "./admin-actions";

export const dynamic = "force-dynamic";

// Colour and short label for each kind of event.
function tag(type: AuditType): [string, string] {
  switch (type) {
    case "login":
    case "logout":
      return ["session", "text-emerald-400"];
    case "session_revoked":
    case "role_changed":
      return ["admin", "text-amber-400"];
    default:
      return ["denied", "text-red-400"];
  }
}

export default async function Admin() {
  await requireRole("admin");
  const events = await getAuditLog(100);

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <p className="eyebrow">Admin</p>
          <h1 className="text-3xl font-semibold tracking-tight">Control panel</h1>
        </div>
        <Link className="btn" href="/dashboard">Dashboard</Link>
      </div>

      <AdminActions />

      <section className="space-y-4">
        <p className="eyebrow">Audit log</p>
        {events.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <div className="card space-y-2 overflow-x-auto font-mono text-[13px]">
            {events.map((e, i) => {
              const [label, color] = tag(e.type);
              return (
                <div key={i} className="flex gap-4 whitespace-nowrap">
                  <time className="text-muted">{new Date(e.ts).toLocaleString("en-GB")}</time>
                  <span className={`w-16 ${color}`}>{label}</span>
                  <span>{describeEvent(e)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
