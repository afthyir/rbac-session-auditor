import Link from "next/link";

const steps = [
  ["01", "Clean the path", "Reject ../, double encoding and other tricks before anything else runs."],
  ["02", "Verify the token", "Check the Supabase JWT signature, issuer, audience and expiry."],
  ["03", "Check the whitelist", "The session has to exist in Redis. Revoked sessions stop here."],
  ["04", "Check the role", "The role is read from Redis, so a change applies on the next request."],
];

const roles = [
  ["Guest", "/dashboard", "Any signed-in user. New accounts start here."],
  ["Engineer", "/engineer", "Engineer role or higher."],
  ["Admin", "/admin", "Audit log, role changes and session revocation."],
];

const sample = [
  ["17:02:11", "login", "text-emerald-400", "User 3f2a9c1d signed in from 203.0.113.7"],
  ["17:03:40", "denied", "text-red-400", "User 3f2a9c1d (guest) tried to open /admin from 203.0.113.7 - access denied"],
  ["17:05:02", "revoked", "text-amber-400", "Admin 91be44a0 revoked 2 session(s) for user 3f2a9c1d"],
  ["17:05:09", "denied", "text-red-400", "User 3f2a9c1d used a revoked or expired session on /dashboard - access denied"],
];

export default function Home() {
  return (
    <div className="space-y-28">
      <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
        <span className="eyebrow rounded-full border border-line px-3 py-1">Project · Security</span>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">RBAC Session Auditor.</h1>
        <p className="max-w-xl text-muted">
          Every request is checked against a Supabase login and a Redis session whitelist. Three roles,
          instant revocation, and an audit log of everything that gets denied.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href="/login" className="btn btn-primary">Try it</Link>
          <a href="https://github.com/afthyir/rbac-session-auditor" className="btn">View source ↗</a>
        </div>
        <a href="#how" className="pt-10 text-xs text-muted transition hover:text-accent">
          Scroll to explore ⌄
        </a>
      </section>

      <section id="how" className="space-y-6">
        <p className="eyebrow">How it works</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map(([n, title, text]) => (
            <div key={n} className="card">
              <span className="font-mono text-xs text-muted">{n}</span>
              <h3 className="mt-2 font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <p className="eyebrow">Roles</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {roles.map(([name, path, text]) => (
            <div key={name} className="card">
              <h3 className="font-medium">{name}</h3>
              <code className="font-mono text-xs text-muted">{path}</code>
              <p className="mt-3 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <p className="eyebrow">Console · example output</p>
        <div className="card space-y-2 overflow-x-auto font-mono text-[13px]">
          {sample.map(([time, tag, color, text]) => (
            <div key={time} className="flex gap-4 whitespace-nowrap">
              <span className="text-muted">{time}</span>
              <span className={`w-16 ${color}`}>{tag}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">
          Create an account, try opening <code className="font-mono">/admin</code> as a guest, and the
          attempt shows up in the real log.
        </p>
      </section>
    </div>
  );
}
