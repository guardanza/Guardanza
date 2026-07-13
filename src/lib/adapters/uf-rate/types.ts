export interface UfRateProvider {
  /** UF value (CLP per 1 UF) in force on the given date. */
  getRate(date: Date): Promise<number>;
}
