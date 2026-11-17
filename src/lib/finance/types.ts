/** Data no formato AAAA-MM-DD. */
export type ISODate = string;
/** Mês no formato AAAA-MM. */
export type YearMonth = string;

export type AccountKind = 'checking' | 'savings' | 'credit';

export interface Account {
  id: string;
  institution: string;
  kind: AccountKind;
  name: string;
  /** Saldo atual. No cartão, é o valor usado do limite. */
  balance: number;
  creditLimit?: number;
}

export interface Investment {
  id: string;
  institution: string;
  name: string;
  /** Ex.: "CDB", "RDB", "Fundo de renda fixa". */
  kind: string;
  /** Fração do indexador. 1.2 = 120% do CDI. */
  rateOfCdi?: number;
  invested: number;
  grossValue: number;
  netValue: number;
  taxEstimate: number;
  since?: ISODate;
}

export type Direction = 'in' | 'out';

export interface Transaction {
  id: string;
  accountId: string;
  /** Data em que o valor conta: na conta, a data do lançamento; no cartão, a data da fatura. */
  date: ISODate;
  direction: Direction;
  amount: number;
  description: string;
  installment?: { number: number; total: number };
}

export interface Snapshot {
  source: 'demo' | 'pluggy';
  generatedAt: string;
  accounts: Account[];
  investments: Investment[];
  transactions: Transaction[];
  business?: { accounts: Account[]; transactions: Transaction[] };
}

export type Group =
  | 'Renda'
  | 'Outras entradas'
  | 'Interno'
  | 'Investimento'
  | 'Moradia & contas'
  | 'Alimentação'
  | 'Saúde'
  | 'Transporte'
  | 'Pessoal'
  | 'Assinaturas'
  | 'Lazer'
  | 'Compras'
  | 'Outros';

export interface CategoryRule {
  pattern: RegExp;
  category: string;
  group: Group;
  /** Restringe a regra a entradas ou saídas. */
  direction?: Direction;
  /** Valor exato, para recorrências identificadas pelo valor. */
  amount?: number;
}

export interface Entry extends Transaction {
  month: YearMonth;
  future: boolean;
  category: string;
  group: Group;
  accountName: string;
  /** Valor com sinal: positivo para entrada, negativo para saída. */
  signed: number;
}

export interface Budget {
  category: string;
  group: Group;
  limit: number;
}

export interface MeiAssumptions {
  expectedMonthlyRevenue: number;
  monthlyDas: number;
  /** Limite anual de faturamento por ano. */
  limits: Record<string, number>;
  /** Parte do faturamento isenta de IR sem escrituração (0.32 para serviços). */
  presumption: number;
  /** Rendimento tributável anual isento de IR. */
  irExemptAnnual: number;
  /** Rendimento tributável acima do qual a declaração é obrigatória. */
  filingThreshold: number;
}

export interface Assumptions {
  expectedIncome: number;
  cdiAnnual: number;
  /** Rendimento médio das aplicações em fração do CDI. */
  pctCdi: number;
  incomeTax: number;
  reserveMonths: number;
  goalAmount: number;
  goalYear: number;
  goalMonth: number;
  /** Reserva mensal para gastos sem teto (terapia, manutenção…). */
  occasionalExpenses: number;
  /** Gastos extras previstos por mês (AAAA-MM → valor). */
  extras: Record<YearMonth, number>;
  mei: MeiAssumptions;
}

export interface Settings {
  budgets: Budget[];
  assumptions: Assumptions;
}
