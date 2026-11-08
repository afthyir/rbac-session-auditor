import Link from "next/link";

const tiers = [
  { name: "Guest", path: "/dashboard", text: "Any signed-in user. Can see their own session." },
  { name: "Engineer", path: "/engineer", text: "Engineer role or higher." },
  { name: "Admin", path: "/admin", text: "Audit log, role changes and session revocation." },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">RBAC Session Auditor</h1>
        <p className="max-w-2xl text-zinc-400">
          Next.js middleware that checks every request against a Supabase login and a Redis session
          whitelist, enforces three roles, and logs every denied attempt and session change.
        </p>
        <div className="flex gap-3 pt-2">
          <Link href="/login" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400">
            Sign in
          </Link>
          <a
            href="https://github.com/afthyir/rbac-session-auditor"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
          >
            View source
          </a>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className="rounded-xl border border-zinc-800 p-4">
            <h2 className="font-medium">{t.name}</h2>
            <code className="text-xs text-zinc-500">{t.path}</code>
            <p className="mt-2 text-sm text-zinc-400">{t.text}</p>
          </div>
        ))}
      </section>

      <p className="text-sm text-zinc-500">
        New accounts start as Guest. Try opening <code>/admin</code> as one and then check the audit log.
      </p>
    </div>
  );
}
