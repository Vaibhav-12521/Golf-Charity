import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Returns the signed-in user + profile, or null if unauthenticated.
 *
 * Wrapped in React `cache()` so multiple callers within the same request
 * (middleware → layout → page → nav) share a single Supabase round-trip
 * instead of each triggering their own `auth.getUser()` + profile fetch.
 */
export const getSessionUser = cache(async (): Promise<{
  user: { id: string; email: string };
  profile: Profile;
} | null> => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return { user: { id: user.id, email: user.email! }, profile };
});

export async function requireUser() {
  const session = await getSessionUser();
  if (!session) throw new Error("unauthenticated");
  return session;
}

export async function requireAdmin() {
  const session = await getSessionUser();
  if (!session || session.profile.role !== "admin") throw new Error("forbidden");
  return session;
}

export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}
