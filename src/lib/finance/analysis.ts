import type { Account, Assumptions, Budget, Entry, ISODate, Investment, YearMonth } from './types';
import { addMonths, monthOf, shortLabel } from './dates';
import { isSpending } from './categorize';
import { round2, SAVINGS_ANNUAL_RATE, sum } from './money';

export interface MonthRow {
  month: YearMonth;
  label: string;
  current: boolean;
  income: number;
  otherIncome: number;
  spending: number;
  balance: number;
  invested: number;
}

/** Renda, outras entradas, gastos e aplicações de cada mês, do mais antigo ao atual. */
export function monthly(entries: Entry[], today: ISODate): MonthRow[] {
  const m = new Map<YearMonth, MonthRow>();
  const current = monthOf(today);
  for (const e of entries) {
    if (e.future) continue;
    if (!m.has(e.month)) m.set(e.month, { month: e.month, label: shortLabel(e.month), current: e.month === current, income: 0, otherIncome: 0, spending: 0, balance: 0, invested: 0 });
    const r = m.get(e.month)!;
    if (e.group === 'Renda') r.income += e.amount;
    else if (e.group === 'Outras entradas') r.otherIncome += e.amount;
    else if (e.group === 'Investimento') r.invested += e.direction === 'out' ? e.amount : -e.amount;
    else if (isSpending(e)) r.spending += e.amount;
  }
  return [...m.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((r) => ({ ...r, income: round2(r.income), otherIncome: round2(r.otherIncome), spending: round2(r.spending), invested: round2(r.invested), balance: round2(r.income + r.otherIncome - r.spending) }));
}

export interface CategoryMonth { category: string; group: Entry['group']; month: YearMonth; label: string; amount: number }

/** Gasto de cada categoria em cada mês. */
export function categoryByMonth(entries: Entry[]): CategoryMonth[] {
  const m = new Map<string, CategoryMonth>();
  for (const e of entries) {
    if (!isSpending(e)) continue;
    const k = `${e.category}|${e.month}`;
    if (!m.has(k)) m.set(k, { category: e.category, group: e.group, month: e.month, label: shortLabel(e.month), amount: 0 });
    m.get(k)!.amount += e.amount;
  }
  return [...m.values()].map((r) => ({ ...r, amount: round2(r.amount) }));
}

export interface BudgetRow { category: string; group: Entry['group']; limit: number; spent: number; remaining: number; pct: number | null; avg3: number }

/** Gasto do mês atual por categoria contra o teto, e a média dos 3 meses fechados anteriores. */
export function budgetStatus(entries: Entry[], budgets: Budget[], today: ISODate): BudgetRow[] {
  const current = monthOf(today);
  const closed = [1, 2, 3].map((k) => addMonths(current, -k));
  const m = new Map<string, { category: string; group: Entry['group']; limit: number; spent: number; sum3: number }>();
  for (const b of budgets) m.set(b.category, { category: b.category, group: b.group, limit: b.limit, spent: 0, sum3: 0 });
  for (const e of entries) {
    if (!isSpending(e)) continue;
    if (!m.has(e.category)) m.set(e.category, { category: e.category, group: e.group, limit: 0, spent: 0, sum3: 0 });
    const r = m.get(e.category)!;
    if (e.month === current) r.spent += e.amount;
    if (closed.includes(e.month)) r.sum3 += e.amount;
  }
  return [...m.values()]
    .map((r) => ({ category: r.category, group: r.group, limit: r.limit, spent: round2(r.spent), remaining: round2(r.limit - r.spent), pct: r.limit > 0 ? r.spent / r.limit : null, avg3: round2(r.sum3 / 3) }))
    .filter((r) => r.limit > 0 || r.spent > 0);
}

export interface SavingRow { category: string; avg3: number; limit: number; saving: number }

/** Categorias cuja média recente passa do teto, com quanto daria para economizar por mês. */
export function savingOpportunities(rows: BudgetRow[], minimum = 20): SavingRow[] {
  return rows
    .filter((r) => r.limit > 0 && r.avg3 - r.limit >= minimum)
    .map((r) => ({ category: r.category, avg3: r.avg3, limit: r.limit, saving: round2(r.avg3 - r.limit) }))
    .sort((a, b) => b.saving - a.saving);
}

export interface InstallmentRow { month: YearMonth; label: string; amount: number }

/** Parcelas do cartão que ainda vão cair, somadas por mês da fatura. */
export function futureInstallments(entries: Entry[]): InstallmentRow[] {
  const m = new Map<YearMonth, number>();
  for (const e of entries) if (e.future && e.direction === 'out') m.set(e.month, (m.get(e.month) ?? 0) + e.amount);
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, v]) => ({ month, label: shortLabel(month), amount: round2(v) }));
}

export interface HoldingRow { item: string; institution: string; yields: string; value: number }

/** Onde está o dinheiro: contas, poupança, aplicações e o cartão (negativo). */
export function holdings(accounts: Account[], investments: Investment[]): HoldingRow[] {
  const order = { checking: 1, savings: 2, investment: 3, credit: 9 } as const;
  const rows: (HoldingRow & { o: number })[] = [];
  for (const a of accounts) {
    if (a.kind === 'credit') rows.push({ item: `Cartão ${a.institution} (limite usado)`, institution: a.institution, yields: '—', value: -a.balance, o: order.credit });
    else if (a.kind === 'savings') rows.push({ item: `${a.institution} · Poupança`, institution: a.institution, yields: '0,5% ao mês + TR', value: a.balance, o: order.savings });
    else rows.push({ item: `${a.institution} · Conta`, institution: a.institution, yields: '—', value: a.balance, o: order.checking });
  }
  const g = new Map<string, HoldingRow & { o: number }>();
  for (const i of investments) {
    const yields = i.rateOfCdi != null ? `${Math.round(i.rateOfCdi * 100)}% do CDI` : 'pós-fixado';
    const key = `${i.institution} · ${i.kind}${i.rateOfCdi != null ? ' ' + yields : ''}`;
    if (!g.has(key)) g.set(key, { item: key, institution: i.institution, yields, value: 0, o: order.investment });
    g.get(key)!.value += i.netValue;
  }
  rows.push(...g.values());
  return rows.sort((a, b) => a.o - b.o || b.value - a.value).map(({ o: _o, ...r }) => ({ ...r, value: round2(r.value) }));
}

export interface ReturnRow { item: string; invested: number | null; gross: number; earned: number; earnedPct: number | null; tax: number; net: number; annualRate: number | null }

/** Quanto cada tipo de aplicação já rendeu e quanto rende ao ano. Inclui a poupança. */
export function investmentReturns(accounts: Account[], investments: Investment[], entries: Entry[], a: Assumptions): ReturnRow[] {
  const g = new Map<string, { item: string; rate: number | null; invested: number; gross: number; tax: number; net: number }>();
  for (const i of investments) {
    const key = `${i.institution} · ${i.kind}${i.rateOfCdi != null ? ` ${Math.round(i.rateOfCdi * 100)}% do CDI` : ''}`;
    if (!g.has(key)) g.set(key, { item: key, rate: i.rateOfCdi ?? null, invested: 0, gross: 0, tax: 0, net: 0 });
    const r = g.get(key)!;
    r.invested += i.invested; r.gross += i.grossValue; r.tax += i.taxEstimate; r.net += i.netValue;
  }
  const rows: ReturnRow[] = [...g.values()].map((r) => ({
    item: r.item,
    invested: round2(r.invested),
    gross: round2(r.gross),
    earned: round2(r.gross - r.invested),
    earnedPct: r.invested > 0 ? (r.gross - r.invested) / r.invested : null,
    tax: round2(r.tax),
    net: round2(r.net),
    annualRate: r.rate != null ? r.rate * a.cdiAnnual : null,
  }));
  for (const s of accounts.filter((x) => x.kind === 'savings')) {
    const earned = sum(entries.filter((e) => e.category === 'Rendimentos' && e.accountId === s.id), (e) => e.amount);
    rows.push({ item: `${s.institution} · Poupança`, invested: null, gross: s.balance, earned: round2(earned), earnedPct: null, tax: 0, net: s.balance, annualRate: SAVINGS_ANNUAL_RATE });
  }
  return rows.sort((x, y) => (y.annualRate ?? 0) - (x.annualRate ?? 0));
}

export interface Kpis {
  avgIncome: number;
  avgSpending: number;
  avgBalance: number;
  savingsRate: number | null;
  netWorth: number;
  spentThisMonth: number;
  budgetTotal: number;
  budgetPct: number | null;
  reserveMonths: number | null;
  cardUsage: number | null;
  futureInstallments: number;
  savingsBalance: number;
  /** Quanto renderia a mais por ano tirar a poupança e aplicar a 120% do CDI. */
  gainLeavingSavings: number;
}

export function kpis(months: MonthRow[], hold: HoldingRow[], budget: BudgetRow[], inst: InstallmentRow[], accounts: Account[], a: Assumptions): Kpis {
  const closed = months.filter((m) => !m.current).slice(-3);
  const n = closed.length || 1;
  const avgIncome = sum(closed, (m) => m.income) / n;
  const allIn = sum(closed, (m) => m.income + m.otherIncome) / n;
  const avgSpending = sum(closed, (m) => m.spending) / n;
  const avgBalance = sum(closed, (m) => m.balance) / n;
  const current = months.find((m) => m.current);
  const netWorth = sum(hold, (h) => h.value);
  const budgetTotal = sum(budget.filter((b) => b.limit > 0), (b) => b.limit);
  const spent = current?.spending ?? 0;
  const card = accounts.find((x) => x.kind === 'credit');
  const savings = sum(accounts.filter((x) => x.kind === 'savings'), (x) => x.balance);
  return {
    avgIncome: round2(avgIncome),
    avgSpending: round2(avgSpending),
    avgBalance: round2(avgBalance),
    savingsRate: allIn > 0 ? avgBalance / allIn : null,
    netWorth: round2(netWorth),
    spentThisMonth: round2(spent),
    budgetTotal: round2(budgetTotal),
    budgetPct: budgetTotal > 0 ? spent / budgetTotal : null,
    reserveMonths: avgSpending > 0 ? Math.round((netWorth / avgSpending) * 10) / 10 : null,
    cardUsage: card?.creditLimit ? card.balance / card.creditLimit : null,
    futureInstallments: round2(sum(inst, (i) => i.amount)),
    savingsBalance: round2(savings),
    gainLeavingSavings: round2(savings * (a.cdiAnnual * 1.2 * (1 - a.incomeTax) - SAVINGS_ANNUAL_RATE)),
  };
}
