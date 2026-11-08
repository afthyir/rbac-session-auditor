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

  return (
    <section className="space-y-4">
      <p className="eyebrow">Manage a user</p>
      <div className="card flex flex-wrap items-center gap-2">
        <input
          className="input min-w-64 flex-1 font-mono"
          placeholder="User id (uuid)"
          value={userId}
          onChange={(e) => setUserId(e.target.value.trim())}
        />
        <select className="input !w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
          <option>guest</option>
          <option>engineer</option>
          <option>admin</option>
        </select>
        <button className="btn" onClick={() => post("/api/admin/role", { sub: userId, role })}>
          Set role
        </button>
        <button className="btn" onClick={() => post("/api/admin/revoke", { sub: userId })}>
          Revoke sessions
        </button>
      </div>
      {message && <p className="text-sm text-amber-400">{message}</p>}
    </section>
  );
}
