import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "RBAC Session Auditor",
  description: "Role-based access control with Supabase Auth, a Redis session whitelist and an audit log.",
};

export const viewport: Viewport = {
  themeColor: "#060607",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg font-sans text-accent antialiased">
        <header className="fixed inset-x-0 top-0 z-10 border-b border-line/60 bg-bg/70 backdrop-blur">
          <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Afthy.
            </Link>
            <div className="flex items-center gap-5 text-sm text-muted">
              <Link href="/dashboard" className="transition hover:text-accent">
                Dashboard
              </Link>
              <a
                href="https://github.com/afthyir/rbac-session-auditor"
                className="transition hover:text-accent"
              >
                Source ↗
              </a>
              <Link href="/login" className="btn btn-primary !py-1.5">
                Sign in
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-6 pb-24 pt-28">{children}</main>

        <footer className="border-t border-line/60 py-6 text-center font-mono text-xs text-muted">
          afthyir@web ~ % rbac-session-auditor
        </footer>
      </body>
    </html>
  );
}
