"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminActions() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("guest");
  const [message, setMessage] = useState("");

  async function post(url: string, body: object) {
    setMessage("");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setMessage(res.ok ? "Done." : (data.error ?? "Failed."));
    router.refresh();
  }

  const field = "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-indigo-400";
  const button = "rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900";

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Manage a user</h2>
      <div className="flex flex-wrap gap-2">
        <input className={`${field} min-w-72 flex-1 font-mono`} placeholder="User id (uuid)" value={userId} onChange={(e) => setUserId(e.target.value.trim())} />
        <select className={field} value={role} onChange={(e) => setRole(e.target.value)}>
          <option>guest</option>
          <option>engineer</option>
          <option>admin</option>
        </select>
        <button className={button} onClick={() => post("/api/admin/role", { sub: userId, role })}>Set role</button>
        <button className={button} onClick={() => post("/api/admin/revoke", { sub: userId })}>Revoke sessions</button>
      </div>
      {message && <p className="text-sm text-amber-400">{message}</p>}
    </section>
  );
}
