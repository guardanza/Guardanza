import { mockScreeningProvider } from "./mock";
import type { ScreeningProvider } from "./types";

export type { ScreeningProvider, ScreeningResult, ScreeningStatus } from "./types";

export const screeningProvider: ScreeningProvider = mockScreeningProvider;
