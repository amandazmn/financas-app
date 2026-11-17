import { describe, expect, it } from 'vitest';
import { addMonths, monthsBetween, shortLabel } from './dates';
import { categorize, cleanDescription } from './categorize';
import { budgetStatus, monthly, savingOpportunities } from './analysis';
import { goal } from './plan';
import { meiMonthly, meiSummary } from './mei';
import { netMonthlyRate } from './money';
import type { Account, Assumptions, Transaction } from './types';
import { defaultSettings } from '@/config/defaults';

const today = '2026-11-15';
const accounts: Account[] = [
  { id: 'c', institution: 'Banco A', kind: 'checking', name: 'Conta', balance: 1000 },
  { id: 'k', institution: 'Banco A', kind: 'credit', name: 'Cartão', balance: 500, creditLimit: 2000 },
];
const tx = (id: string, date: string, direction: 'in' | 'out', amount: number, description: string, accountId = 'c'): Transaction => ({ id, accountId, date, direction, amount, description });

describe('datas', () => {
  it('soma meses atravessando o ano', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthsBetween('2026-11', '2027-06')).toBe(7);
    expect(shortLabel('2026-09')).toBe('set/26');
  });
});

describe('categorização', () => {
  const txs = [
    tx('1', '2026-11-10', 'in', 5000, 'TRANSFERENCIA RECEBIDA 12.345.678 FULANA DE TAL'),
    tx('2', '2026-11-11', 'out', 300, 'SUPERMERCADO BOM PRECO'),
    tx('3', '2026-11-12', 'out', 200, 'PIX ENVIADO - DES  FULANA DE TAL 12/11'),
    tx('4', '2026-11-12', 'out', 45, 'Pix enviado'),
    tx('5', '2026-12-09', 'out', 100, 'LOJA X', 'k'),
    tx('6', '2026-11-13', 'out', 10, 'CONTA DESCONHECIDA', 'outra'),
  ];
  const e = categorize(txs, accounts, {
    today,
    owner: { name: 'Fulana de Tal', cnpj: '12.345.678/0001-90' },
    rules: [{ pattern: /PIX/, category: 'Celular', group: 'Moradia & contas', direction: 'out', amount: 45 }],
  });
  const by = Object.fromEntries(e.map((x) => [x.id, x]));

  it('reconhece renda do CNPJ e transferências do titular', () => {
    expect(by['1'].group).toBe('Renda');
    expect(by['3'].group).toBe('Interno');
  });
  it('usa palavras-chave e regras extras por valor', () => {
    expect(by['2'].category).toBe('Mercado');
    expect(by['4'].category).toBe('Celular');
  });
  it('marca lançamentos futuros e ignora contas desconhecidas', () => {
    expect(by['5'].future).toBe(true);
    expect(by['6']).toBeUndefined();
  });
  it('limpa descrições de banco', () => {
    expect(cleanDescription('PIX ENVIADO - DES  LOJA ABC 10/11 - DOCTO: 123')).toBe('Pix LOJA ABC');
  });
});

describe('meses e teto', () => {
  const txs = [
    tx('a', '2026-08-05', 'out', 900, 'SUPERMERCADO'),
    tx('b', '2026-09-05', 'out', 900, 'SUPERMERCADO'),
    tx('c', '2026-10-05', 'out', 900, 'SUPERMERCADO'),
    tx('d', '2026-11-05', 'out', 400, 'SUPERMERCADO'),
    tx('e', '2026-11-06', 'out', 1000, 'PAGAMENTO DE FATURA'),
    tx('f', '2026-11-06', 'out', 2000, 'APLICACAO RDB'),
    tx('g', '2026-11-01', 'in', 6000, 'SALARIO EMPRESA'),
  ];
  const e = categorize(txs, accounts, { today });
  it('não conta transferências e aplicações como gasto', () => {
    const nov = monthly(e, today).find((m) => m.month === '2026-11')!;
    expect(nov.spending).toBe(400);
    expect(nov.income).toBe(6000);
    expect(nov.invested).toBe(2000);
    expect(nov.current).toBe(true);
  });
  it('compara o mês com o teto e a média de 3 meses', () => {
    const rows = budgetStatus(e, [{ category: 'Mercado', group: 'Alimentação', limit: 700 }], today);
    const m = rows.find((r) => r.category === 'Mercado')!;
    expect(m.spent).toBe(400);
    expect(m.avg3).toBe(900);
    expect(savingOpportunities(rows)[0].saving).toBe(200);
  });
});

describe('meta', () => {
  const a: Assumptions = { ...defaultSettings(today).assumptions, expectedIncome: 6000, goalAmount: 30000, goalYear: 2027, goalMonth: 6, occasionalExpenses: 0, extras: {} };
  const k = { netWorth: 9000, avgSpending: 4000 } as Parameters<typeof goal>[0];
  it('o aporte necessário chega exatamente na meta no prazo', () => {
    const g = goal(k, [], a, today);
    const need = g.scenarios[2];
    expect(g.months).toBe(7);
    expect(need.atDeadline).toBe(30000);
    expect(need.reachedIn).toBe('jun/27');
    const rate = netMonthlyRate(a.cdiAnnual, a.pctCdi, a.incomeTax);
    let v = 9000;
    for (let i = 0; i < 7; i++) v = v * (1 + rate) + need.savePerMonth;
    expect(Math.abs(v - 30000)).toBeLessThan(10);
  });
  it('gastos extras aumentam o aporte necessário', () => {
    const base = goal(k, [], a, today).scenarios[2].savePerMonth;
    const withExtra = goal(k, [], { ...a, extras: { '2026-12': 1500 } }, today).scenarios[2].savePerMonth;
    expect(withExtra).toBeGreaterThan(base);
  });
});

describe('MEI', () => {
  const txs = [
    tx('1', '2026-10-10', 'in', 5000, 'PIX RECEBIDO - REM  CLIENTE LTDA'),
    tx('2', '2026-10-11', 'out', 86.05, 'PAGTO ELETRONICO TRIBUTO - PLATAFORMA-SIMPLES NACIONAL'),
    tx('3', '2026-10-12', 'out', 4000, 'PIX ENVIADO - DES  FULANA DE TAL'),
    tx('4', '2026-10-19', 'in', 0.2, 'RENTAB.INVEST FACILCRED'),
    tx('5', '2026-11-10', 'in', 5000, 'PIX RECEBIDO - REM  CLIENTE LTDA'),
  ];
  const m = meiMonthly(txs, today, 'Fulana de Tal');
  it('separa faturamento, DAS e retiradas', () => {
    const out = m.find((r) => r.month === '2026-10')!;
    expect(out).toMatchObject({ revenue: 5000, das: 86.05, withdrawals: 4000, yield: 0.2 });
  });
  it('projeta o ano e estima a parte tributável', () => {
    const s = meiSummary(m, [], defaultSettings(today).assumptions.mei, today);
    expect(s.revenueYtd).toBe(10000);
    expect(s.projectedRevenue).toBe(10000 + 6500);
    expect(s.exemptPart).toBe(Math.round(16500 * 0.32));
    expect(s.estimatedTax).toBe(0);
    expect(s.mustFile).toBe(false);
  });
});
