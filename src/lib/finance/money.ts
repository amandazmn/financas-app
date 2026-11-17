export const round2 = (x: number) => Math.round(x * 100) / 100;
export const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);

/** Taxa mensal líquida de IR para uma aplicação que rende `pctCdi` do CDI anual. */
export function netMonthlyRate(cdiAnnual: number, pctCdi: number, incomeTax: number): number {
  return (Math.pow(1 + cdiAnnual * pctCdi, 1 / 12) - 1) * (1 - incomeTax);
}

/** Rendimento anual da poupança (0,5% ao mês, sem TR). */
export const SAVINGS_ANNUAL_RATE = Math.pow(1.005, 12) - 1;
