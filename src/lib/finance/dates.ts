import type { ISODate, YearMonth } from './types';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Data de hoje em São Paulo, no formato AAAA-MM-DD. */
export function todayInBrazil(now: Date = new Date()): ISODate {
  return now.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

export function monthOf(date: ISODate): YearMonth {
  return date.slice(0, 7);
}

/** Soma `n` meses a um AAAA-MM. */
export function addMonths(month: YearMonth, n: number): YearMonth {
  const [y, m] = month.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

/** Diferença em meses entre dois AAAA-MM (b − a). */
export function monthsBetween(a: YearMonth, b: YearMonth): number {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return yb * 12 + mb - (ya * 12 + ma);
}

/** "2026-11" → "nov/26". */
export function shortLabel(month: YearMonth): string {
  const [y, m] = month.split('-');
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`;
}

/** "2026-12" → "dezembro de 2026". */
export function longLabel(month: YearMonth): string {
  const [y, m] = month.split('-');
  return `${MONTHS_LONG[Number(m) - 1]} de ${y}`;
}
