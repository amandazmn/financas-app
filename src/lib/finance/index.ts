import type { CategoryRule, ISODate, Settings, Snapshot } from './types';
import { categorize, type Owner } from './categorize';
import { budgetStatus, categoryByMonth, futureInstallments, holdings, investmentReturns, kpis, monthly, savingOpportunities } from './analysis';
import { goal, nextMonth, projection } from './plan';
import { meiMonthly, meiSummary } from './mei';

export * from './types';
export * from './dates';

export interface DashboardOptions { today: ISODate; owner?: Owner; rules?: CategoryRule[] }

/** Calcula tudo o que o painel mostra a partir dos dados das contas e das configurações. */
export function computeDashboard(snap: Snapshot, settings: Settings, opts: DashboardOptions) {
  const { today } = opts;
  const a = settings.assumptions;
  const entries = categorize(snap.transactions, snap.accounts, { today, owner: opts.owner, rules: opts.rules });
  const months = monthly(entries, today);
  const byCategory = categoryByMonth(entries);
  const budget = budgetStatus(entries, settings.budgets, today);
  const installments = futureInstallments(entries);
  const hold = holdings(snap.accounts, snap.investments);
  const k = kpis(months, hold, budget, installments, snap.accounts, a);
  const g = goal(k, budget, a, today);
  const mei = snap.business
    ? (() => {
        const m = meiMonthly(snap.business.transactions, today, opts.owner?.name);
        return { months: m, summary: meiSummary(m, snap.business.accounts, a.mei, today) };
      })()
    : null;
  return {
    source: snap.source,
    generatedAt: snap.generatedAt,
    today,
    entries,
    months,
    byCategory,
    budget,
    savings: savingOpportunities(budget),
    installments,
    holdings: hold,
    returns: investmentReturns(snap.accounts, snap.investments, entries, a),
    kpis: k,
    projection: projection(k, budget, a, today),
    goal: g,
    nextMonth: nextMonth(budget, installments, g, a, today),
    mei,
  };
}

export type Dashboard = ReturnType<typeof computeDashboard>;
