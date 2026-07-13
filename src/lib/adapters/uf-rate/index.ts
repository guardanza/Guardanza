import { mockUfRateProvider } from "./mock";
import type { UfRateProvider } from "./types";

export type { UfRateProvider } from "./types";

// Single seam for swapping the UF source later (e.g. mindicador.cl). Every
// caller imports `ufRateProvider` from here — never mock.ts directly.
export const ufRateProvider: UfRateProvider = mockUfRateProvider;
