export type ScreeningStatus = "pendiente" | "verde" | "amarillo" | "rojo";

export interface ScreeningResult {
  status: ScreeningStatus;
  checkedAt: Date;
}

export interface ScreeningProvider {
  /** Run a tenant screening check for the given RUT. */
  check(rut: string): Promise<ScreeningResult>;
}
