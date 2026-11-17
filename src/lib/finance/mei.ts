import type { Account, ISODate, MeiAssumptions, Transaction, YearMonth } from './types';
import { monthOf, shortLabel } from './dates';
import { round2, sum } from './money';

export interface MeiMonth { month: YearMonth; label: string; revenue: number; das: number; withdrawals: number; otherOut: number; yield: number }

/**
 * Receitas e saídas da conta do MEI por mês. Serve como relatório mensal de receitas brutas.
 * `ownerName` reconhece as retiradas para a conta pessoal.
 */
export function meiMonthly(txs: Transaction[], today: ISODate, ownerName?: string): MeiMonth[] {
  const owner = ownerName ? ownerName.trim().split(/\s+/).slice(0, 2).join(' ').toUpperCase() : null;
  const m = new Map<YearMonth, MeiMonth>();
  for (const t of txs) {
    if (t.date > today) continue;
    const month = monthOf(t.date);
    if (!m.has(month)) m.set(month, { month, label: shortLabel(month), revenue: 0, das: 0, withdrawals: 0, otherOut: 0, yield: 0 });
    const r = m.get(month)!;
    const d = t.description.toUpperCase();
    const toOwner = owner ? d.includes(owner) : /RETIRADA|PRO.?LABORE/.test(d);
    if (t.direction === 'in') {
      if (/RENTAB|RENDIMENTO|RESGATE/.test(d)) r.yield += t.amount;
      else if (!toOwner) r.revenue += t.amount;
    } else if (/SIMPLES NACIONAL|DAS-?MEI|PGMEI/.test(d)) r.das += t.amount;
    else if (toOwner) r.withdrawals += t.amount;
    else r.otherOut += t.amount;
  }
  return [...m.values()]
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((r) => ({ ...r, revenue: round2(r.revenue), das: round2(r.das), withdrawals: round2(r.withdrawals), otherOut: round2(r.otherOut), yield: round2(r.yield) }));
}

export interface MeiSummary {
  year: number;
  revenueYtd: number;
  limit: number;
  limitPct: number;
  projectedRevenue: number;
  projectedPct: number;
  nextYearLimit: number;
  nextYearRevenue: number;
  exemptPart: number;
  taxablePart: number;
  irExemptAnnual: number;
  estimatedTax: number | null;
  filingThreshold: number;
  mustFile: boolean;
  accountBalance: number;
}

/**
 * Faturamento do ano contra o limite do MEI e estimativa do IR da pessoa física sem escrituração contábil:
 * a parte isenta é `presumption` × faturamento e o resto do lucro é rendimento tributável.
 */
export function meiSummary(months: MeiMonth[], accounts: Account[], a: MeiAssumptions, today: ISODate): MeiSummary {
  const year = today.slice(0, 4);
  const current = monthOf(today);
  const ytd = months.filter((m) => m.month.startsWith(year));
  const revenue = sum(ytd, (m) => m.revenue);
  const expenses = sum(ytd, (m) => m.das + m.otherOut);
  const billedThisMonth = ytd.some((m) => m.month === current && m.revenue > 0);
  const remaining = 12 - Number(today.slice(5, 7)) + (billedThisMonth ? 0 : 1);
  const projected = revenue + remaining * a.expectedMonthlyRevenue;
  const projectedExpenses = expenses + remaining * a.monthlyDas;
  const limit = a.limits[year] ?? 81000;
  const exempt = projected * a.presumption;
  const taxable = Math.max(0, projected - projectedExpenses - exempt);
  return {
    year: Number(year),
    revenueYtd: Math.round(revenue),
    limit,
    limitPct: revenue / limit,
    projectedRevenue: Math.round(projected),
    projectedPct: projected / limit,
    nextYearLimit: a.limits[String(Number(year) + 1)] ?? limit,
    nextYearRevenue: Math.round(12 * a.expectedMonthlyRevenue),
    exemptPart: Math.round(exempt),
    taxablePart: Math.round(taxable),
    irExemptAnnual: a.irExemptAnnual,
    estimatedTax: taxable <= a.irExemptAnnual ? 0 : null,
    filingThreshold: a.filingThreshold,
    mustFile: taxable > a.filingThreshold,
    accountBalance: Math.round(sum(accounts, (x) => x.balance)),
  };
}
