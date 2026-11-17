import type { Assumptions, ISODate, YearMonth } from './types';
import { addMonths, longLabel, monthOf, monthsBetween, shortLabel } from './dates';
import { netMonthlyRate } from './money';
import type { BudgetRow, InstallmentRow, Kpis } from './analysis';

const budgetTotal = (rows: BudgetRow[]) => rows.filter((r) => r.limit > 0).reduce((s, r) => s + r.limit, 0);
const extra = (a: Assumptions, m: YearMonth) => a.extras[m] ?? 0;

export interface ProjectionRow { month: YearMonth; label: string; withBudget: number; currentPace: number; reserveTarget: number }

/** Patrimônio mês a mês por 12 meses, seguindo o teto ou no ritmo atual de gastos. */
export function projection(k: Kpis, budget: BudgetRow[], a: Assumptions, today: ISODate): ProjectionRow[] {
  const rate = netMonthlyRate(a.cdiAnnual, a.pctCdi, a.incomeTax);
  const plannedSpend = budgetTotal(budget) + a.occasionalExpenses;
  const start = monthOf(today);
  let x = k.netWorth - extra(a, start);
  let y = x;
  const rows: ProjectionRow[] = [];
  for (let i = 1; i <= 12; i++) {
    const m = addMonths(start, i);
    x = x * (1 + rate) + (a.expectedIncome - plannedSpend) - extra(a, m);
    y = y * (1 + rate) + (a.expectedIncome - k.avgSpending) - extra(a, m);
    rows.push({ month: m, label: shortLabel(m), withBudget: Math.round(x), currentPace: Math.round(y), reserveTarget: Math.round(a.reserveMonths * plannedSpend) });
  }
  return rows;
}

export interface GoalScenario {
  scenario: 'Ritmo atual' | 'Seguindo o teto' | 'Necessário para a meta';
  savePerMonth: number;
  spendPerMonth: number;
  atDeadline: number;
  reachedIn: string;
}

export interface Goal {
  target: number;
  current: number;
  progress: number;
  deadline: string;
  months: number;
  scenarios: GoalScenario[];
}

/**
 * Meta de patrimônio: quanto guardar por mês até o prazo (anuidade com o rendimento líquido do CDI,
 * descontando os gastos extras previstos) e em que mês cada ritmo chega lá.
 */
export function goal(k: Kpis, budget: BudgetRow[], a: Assumptions, today: ISODate): Goal {
  const rate = netMonthlyRate(a.cdiAnnual, a.pctCdi, a.incomeTax);
  const start = monthOf(today);
  const deadline = `${a.goalYear}-${String(a.goalMonth).padStart(2, '0')}`;
  const n = Math.max(1, monthsBetween(start, deadline));
  const base = k.netWorth - extra(a, start);
  const f = Math.pow(1 + rate, n);
  let extrasAtDeadline = 0;
  for (let i = 1; i <= n; i++) extrasAtDeadline += extra(a, addMonths(start, i)) * Math.pow(1 + rate, n - i);
  const needed = Math.max(0, ((a.goalAmount - base * f + extrasAtDeadline) * rate) / (f - 1));
  const atDeadline = (save: number) => base * f + (save * (f - 1)) / rate - extrasAtDeadline;
  const reachedIn = (save: number) => {
    let v = base;
    for (let i = 1; i <= 120; i++) {
      v = v * (1 + rate) + save - extra(a, addMonths(start, i));
      if (v >= a.goalAmount) return shortLabel(addMonths(start, i));
    }
    return 'mais de 10 anos';
  };
  const plannedSpend = budgetTotal(budget) + a.occasionalExpenses;
  const make = (scenario: GoalScenario['scenario'], save: number): GoalScenario => ({
    scenario,
    savePerMonth: Math.round(save),
    spendPerMonth: Math.round(a.expectedIncome - save),
    atDeadline: Math.round(atDeadline(save)),
    reachedIn: reachedIn(save),
  });
  return {
    target: a.goalAmount,
    current: Math.round(k.netWorth),
    progress: a.goalAmount > 0 ? k.netWorth / a.goalAmount : 0,
    deadline: shortLabel(deadline),
    months: n,
    scenarios: [
      make('Ritmo atual', a.expectedIncome - k.avgSpending),
      make('Seguindo o teto', a.expectedIncome - plannedSpend),
      make('Necessário para a meta', needed),
    ],
  };
}

export interface NextMonth {
  month: YearMonth;
  label: string;
  income: number;
  budget: number;
  occasional: number;
  extra: number;
  installments: number;
  expectedBalance: number;
  goalSaving: number;
  gap: number;
}

/** O que esperar do próximo mês. */
export function nextMonth(budget: BudgetRow[], inst: InstallmentRow[], g: Goal, a: Assumptions, today: ISODate): NextMonth {
  const m = addMonths(monthOf(today), 1);
  const b = Math.round(budgetTotal(budget));
  const ex = extra(a, m);
  const balance = Math.round(a.expectedIncome - b - a.occasionalExpenses - ex);
  const need = g.scenarios[2].savePerMonth;
  return {
    month: m,
    label: longLabel(m),
    income: a.expectedIncome,
    budget: b,
    occasional: a.occasionalExpenses,
    extra: ex,
    installments: inst.find((i) => i.month === m)?.amount ?? 0,
    expectedBalance: balance,
    goalSaving: need,
    gap: balance - need,
  };
}
