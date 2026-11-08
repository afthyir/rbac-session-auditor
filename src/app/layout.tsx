import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RBAC Session Auditor",
  description: "Role-based access control with Supabase Auth, a Redis session whitelist and an audit log.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <main className="mx-auto max-w-4xl px-6 py-12">{children}</main>
      </body>
    </html>
  );
}
