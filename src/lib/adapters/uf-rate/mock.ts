import type { UfRateProvider } from "./types";

// MOCK — Fase A only. Must return the exact same value Postgres'
// get_uf_rate() would for the same date (see
// supabase/migrations/20260709200021_fn_uf_rate_stub.sql), since this is
// only used for client-side preview (e.g. "esto es aprox. lo que se
// congelará al firmar"). The number that actually gets frozen into
// contracts.uf_rate_at_signing always comes from the database function,
// never from here — this adapter can drift or be swapped independently.
export const mockUfRateProvider: UfRateProvider = {
  async getRate(_date: Date): Promise<number> {
    return 37279.5;
  },
};
