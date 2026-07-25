// RUT is optional at signup (no-friction registration) but required to
// operate — signing or creating a contract needs it. Centralized here so
// every call site agrees on what "complete" means instead of each one
// re-deriving `!!profile.rut` (or forgetting to check it at all).
export function hasCompletedProfile(profile: { rut: string | null } | null | undefined): boolean {
  return Boolean(profile?.rut);
}
