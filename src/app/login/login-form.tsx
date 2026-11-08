"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(mode: "in" | "up") {
    setBusy(true);
    setMessage("");

    // No persistSession: the token isn't kept in localStorage. We hand it to the server once
    // and from then on it lives in an httpOnly cookie that scripts can't read.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    if (!data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      setBusy(false);
      return;
    }

    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: data.session.access_token }),
    });

    if (!res.ok) {
      setMessage("Couldn't start a session. Try again.");
      setBusy(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit("in");
      }}
    >
      <input className="input" type="email" placeholder="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" type="password" placeholder="Password (8+ characters)" autoComplete="current-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="flex gap-2 pt-1">
        <button disabled={busy} className="btn btn-primary flex-1">Sign in</button>
        <button type="button" disabled={busy} onClick={() => submit("up")} className="btn flex-1">
          Create account
        </button>
      </div>
      {message && <p className="pt-1 text-sm text-amber-400">{message}</p>}
    </form>
  );
}
