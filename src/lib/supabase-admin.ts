import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isRole, type Role } from "./session-schema";

// Uses the service role key, which bypasses RLS. Server only, never import this in a client component.

let client: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server env vars are missing");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// Anything unexpected becomes "guest", the lowest role.
export async function getRole(sub: string): Promise<Role> {
  const { data } = await admin().from("profiles").select("role").eq("id", sub).maybeSingle();
  return isRole(data?.role) ? data.role : "guest";
}

export async function getProfile(id: string): Promise<{ id: string; role: Role } | null> {
  const { data } = await admin().from("profiles").select("id, role").eq("id", id).maybeSingle();
  return data && isRole(data.role) ? { id: data.id as string, role: data.role } : null;
}

export async function setRole(sub: string, role: Role): Promise<boolean> {
  const { data, error } = await admin()
    .from("profiles")
    .update({ role })
    .eq("id", sub)
    .select("id")
    .maybeSingle();
  return !error && !!data;
}
