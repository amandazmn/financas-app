import type { Account, Investment, Snapshot, Transaction } from '@/lib/finance/types';
import { addMonths, monthOf } from '@/lib/finance/dates';

/** Gerador pseudoaleatório com semente, para a demo ser igual a cada carga. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEMO_OWNER = { name: 'Ana Exemplo', cnpj: '11.222.333/0001-81' };

/**
 * Dados fictícios de uma pessoa com MEI de serviços: 7 meses de conta corrente, cartão com parcelas,
 * poupança, RDB e CDB, e a conta da empresa. Nenhum dado real.
 */
export function demoSnapshot(today: string): Snapshot {
  const rnd = mulberry32(42);
  const between = (a: number, b: number) => Math.round((a + rnd() * (b - a)) * 100) / 100;
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const current = monthOf(today);
  const day = Number(today.slice(8, 10));
  const tx: Transaction[] = [];
  const biz: Transaction[] = [];
  let id = 0;
  const add = (list: Transaction[], accountId: string, date: string, direction: 'in' | 'out', amount: number, description: string, installment?: Transaction['installment']) =>
    list.push({ id: `t${++id}`, accountId, date, direction, amount, description, installment });

  for (let k = 6; k >= 0; k--) {
    const m = addMonths(current, -k);
    const isCurrent = k === 0;
    const upTo = isCurrent ? day : 28;
    const d = (n: number) => `${m}-${String(Math.min(n, 28)).padStart(2, '0')}`;
    const when = (n: number, fn: () => void) => { if (n <= upTo) fn(); };

    // Empresa: um cliente paga todo dia 10; DAS no dia 18; retiradas para a pessoa física.
    const revenue = k >= 3 ? 5200 : 6500;
    when(10, () => add(biz, 'pj', d(10), 'in', revenue, 'PIX RECEBIDO - REM  CLIENTE EXEMPLO LTDA'));
    when(18, () => add(biz, 'pj', d(18), 'out', 86.05, 'PAGTO ELETRONICO TRIBUTO - PLATAFORMA-SIMPLES NACIONAL'));
    when(10, () => add(biz, 'pj', d(10), 'out', revenue - 300, 'PIX ENVIADO - DES  ANA EXEMPLO'));
    when(10, () => add(tx, 'roxo', d(10), 'in', revenue - 300, 'TRANSFERENCIA RECEBIDA 11.222.333 ANA EXEMPLO'));

    when(5, () => add(tx, 'roxo', d(5), 'out', 1200, 'PIX ENVIADO - DES  CONDOMINIO RESIDENCIAL JARDINS'));
    when(12, () => add(tx, 'vermelho', d(12), 'out', between(110, 170), 'ENERGIA ELETRICA DISTRIBUIDORA'));
    when(10, () => add(tx, 'vermelho', d(10), 'out', 99.9, 'FIBRA NET INTERNET'));
    when(15, () => add(tx, 'roxo', d(15), 'out', 54.99, 'TIM S A CELULAR'));
    when(8, () => add(tx, 'roxo', d(8), 'out', 289.9, 'UNIMED PLANO DE SAUDE'));
    when(6, () => add(tx, 'vermelho', d(6), 'out', 149.9, 'SMART FIT ACADEMIA'));
    when(3, () => add(tx, 'cartao', d(3), 'out', 21.9, 'SPOTIFY'));
    when(7, () => add(tx, 'cartao', d(7), 'out', 44.9, 'NETFLIX.COM'));
    when(20, () => add(tx, 'cartao', d(20), 'out', 110, 'CLAUDE.AI SUBSCRIPTION'));
    when(20, () => add(tx, 'cartao', d(20), 'out', 3.85, 'IOF COMPRA INTERNACIONAL'));
    when(11, () => add(tx, 'roxo', d(11), 'out', 1000, 'APLICACAO RDB'));
    when(25, () => add(tx, 'vermelho', d(25), 'in', between(6, 9), 'RENDIMENTOS POUPANCA'));
    when(9, () => {
      const bill = between(900, 1400);
      add(tx, 'roxo', d(9), 'out', bill, 'PAGAMENTO DE FATURA');
      add(tx, 'cartao', d(9), 'in', bill, 'PAGAMENTO RECEBIDO');
    });

    for (const n of [2, 9, 16, 23]) when(n, () => add(tx, 'roxo', d(n), 'out', between(110, 260), pick(['SUPERMERCADO BOA COMPRA', 'ATACADAO CENTRO', 'HORTIFRUTI DO BAIRRO'])));
    for (let i = 0; i < 9; i++) { const n = 1 + Math.floor(rnd() * 27); when(n, () => add(tx, pick(['roxo', 'cartao']), d(n), 'out', between(18, 75), pick(['IFOOD *RESTAURANTE', 'LANCHONETE DA PRACA', 'CAFE CENTRAL', 'PIZZARIA BELLA', 'PADARIA PAO QUENTE']))); }
    for (const n of [4, 19]) when(n, () => add(tx, 'cartao', d(n), 'out', between(110, 160), 'POSTO IPIRANGA'));
    for (let i = 0; i < 3; i++) { const n = 1 + Math.floor(rnd() * 27); when(n, () => add(tx, 'cartao', d(n), 'out', between(14, 38), 'UBER *TRIP')); }
    when(14, () => add(tx, 'roxo', d(14), 'out', between(30, 140), 'DROGARIA SAO PAULO'));
    when(21, () => add(tx, 'cartao', d(21), 'out', between(40, 260), pick(['INGRESSO.COM CINEMA', 'SYMPLA SHOW', 'BOLICHE STRIKE'])));
    when(17, () => add(tx, 'roxo', d(17), 'out', between(60, 180), 'SALAO BELEZA PURA'));
    when(13, () => add(tx, 'cartao', d(13), 'out', between(80, 150), 'PETZ PET SHOP'));
    when(22, () => add(tx, 'roxo', d(22), 'out', between(40, 200), 'PIX ENVIADO - DES  MARIA SILVA'));
    for (let i = 0; i < 2; i++) { const n = 1 + Math.floor(rnd() * 27); when(n, () => add(tx, 'cartao', d(n), 'out', between(40, 220), pick(['MERCADOLIVRE*LOJA', 'AMAZON BR', 'SHOPEE BRASIL', 'PAGSEGURO *LOJINHA']))); }
    if (k % 2 === 0) when(24, () => add(tx, 'cartao', d(24), 'out', between(90, 280), pick(['RENNER LOJA', 'C&A MODAS', 'ZARA BRASIL'])));

    // Compras parceladas: cada parcela cai num mês, inclusive nos futuros.
    if (k === 4 || k === 1) {
      const total = k === 4 ? 6 : 10;
      const value = k === 4 ? 89.9 : 129.9;
      const name = k === 4 ? 'MAGALU NOTEBOOK STAND' : 'AMAZON BR CADEIRA ESCRITORIO';
      for (let p = 1; p <= total; p++) add(tx, 'cartao', `${addMonths(m, p - 1)}-07`, 'out', value, name, { number: p, total });
    }
  }

  const accounts: Account[] = [
    { id: 'roxo', institution: 'Banco Roxo', kind: 'checking', name: 'Conta', balance: 2140.35 },
    { id: 'cartao', institution: 'Banco Roxo', kind: 'credit', name: 'Cartão', balance: 1890.4, creditLimit: 4000 },
    { id: 'vermelho', institution: 'Banco Vermelho', kind: 'checking', name: 'Conta', balance: 312.8 },
    { id: 'poup', institution: 'Banco Vermelho', kind: 'savings', name: 'Poupança', balance: 1520.1 },
  ];
  // Rendimentos da poupança caem na conta de poupança.
  for (const t of tx) if (t.description.startsWith('RENDIMENTOS POUPANCA')) t.accountId = 'poup';

  const investments: Investment[] = [
    { id: 'i1', institution: 'Banco Roxo', name: 'RDB', kind: 'RDB', rateOfCdi: 1.2, invested: 6000, grossValue: 6312.4, netValue: 6249.9, taxEstimate: 62.5 },
    { id: 'i2', institution: 'Banco Vermelho', name: 'CDB', kind: 'CDB', rateOfCdi: 1.0, invested: 2000, grossValue: 2174.2, netValue: 2139.4, taxEstimate: 34.8 },
  ];

  return {
    source: 'demo',
    generatedAt: new Date().toISOString(),
    accounts,
    investments,
    transactions: tx,
    business: { accounts: [{ id: 'pj', institution: 'Banco Azul Empresas', kind: 'checking', name: 'Conta PJ', balance: 912.3 }], transactions: biz },
  };
}
