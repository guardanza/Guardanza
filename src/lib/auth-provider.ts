import type { User } from "@supabase/supabase-js";

// Derived from the real session on every read, never stored — Supabase
// already tracks this per-identity (a user could even have both linked),
// so a cached "auth_provider" column would just be one more thing that
// can drift out of sync with the truth.
export function getAuthProvider(user: User): "google" | "email" {
  return user.app_metadata?.provider === "google" ? "google" : "email";
}
