import type { Settings } from '@/lib/finance/types';
import { addMonths, monthOf, todayInBrazil } from '@/lib/finance/dates';

/**
 * Configurações iniciais. No app elas podem ser editadas em "Ajustes" e ficam salvas no navegador.
 * O prazo da meta é relativo a hoje para a demo continuar fazendo sentido com o passar do tempo.
 */
export function defaultSettings(today = todayInBrazil()): Settings {
  const deadline = addMonths(monthOf(today), 8);
  const [gy, gm] = deadline.split('-').map(Number);
  const year = Number(today.slice(0, 4));
  return {
    budgets: [
      { category: 'Moradia', group: 'Moradia & contas', limit: 1200 },
      { category: 'Energia', group: 'Moradia & contas', limit: 150 },
      { category: 'Internet', group: 'Moradia & contas', limit: 100 },
      { category: 'Celular', group: 'Moradia & contas', limit: 60 },
      { category: 'Mercado', group: 'Alimentação', limit: 600 },
      { category: 'Restaurantes & lanches', group: 'Alimentação', limit: 250 },
      { category: 'Plano de saúde', group: 'Saúde', limit: 300 },
      { category: 'Farmácia', group: 'Saúde', limit: 120 },
      { category: 'Academia & esportes', group: 'Saúde', limit: 150 },
      { category: 'Combustível', group: 'Transporte', limit: 250 },
      { category: 'Transporte por app', group: 'Transporte', limit: 100 },
      { category: 'Beleza & cuidados', group: 'Pessoal', limit: 100 },
      { category: 'Pets', group: 'Pessoal', limit: 120 },
      { category: 'Assinaturas & apps', group: 'Assinaturas', limit: 150 },
      { category: 'Lazer & eventos', group: 'Lazer', limit: 200 },
      { category: 'Roupas & casa', group: 'Compras', limit: 150 },
      { category: 'Compras diversas', group: 'Compras', limit: 250 },
      { category: 'Pix para pessoas', group: 'Outros', limit: 100 },
    ],
    assumptions: {
      expectedIncome: 6500,
      cdiAnnual: 0.1365,
      pctCdi: 1.1,
      incomeTax: 0.175,
      reserveMonths: 6,
      goalAmount: 30000,
      goalYear: gy,
      goalMonth: gm,
      occasionalExpenses: 150,
      extras: {},
      mei: {
        expectedMonthlyRevenue: 6500,
        monthlyDas: 87.05,
        limits: { [String(year - 1)]: 81000, '2026': 81000, '2027': 110000, '2028': 140000, [String(Math.max(year, 2028))]: 140000 },
        presumption: 0.32,
        irExemptAnnual: 60000,
        filingThreshold: 35584,
      },
    },
  };
}
