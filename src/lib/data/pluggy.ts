import 'server-only';
import type { Account, Investment, Snapshot, Transaction } from '@/lib/finance/types';

/**
 * Cliente mínimo da API da Pluggy (https://docs.pluggy.ai), só leitura.
 * Com o Meu Pluggy (gratuito), você conecta seus bancos em https://meu.pluggy.ai, autoriza a sua aplicação
 * e usa os IDs dos "items" (conexões) aqui.
 */
const BASE = 'https://api.pluggy.ai';

interface Page<T> { results: T[]; page?: number; totalPages?: number }

interface PluggyItem { id: string; connector?: { name?: string } }
interface PluggyAccount { id: string; type: 'BANK' | 'CREDIT'; subtype?: string; name: string; marketingName?: string | null; balance: number; creditData?: { creditLimit?: number | null } | null }
interface PluggyTransaction {
  id: string; accountId: string; description: string; amount: number; date: string; type: 'DEBIT' | 'CREDIT';
  creditCardMetadata?: { installmentNumber?: number; totalInstallments?: number; billId?: string } | null;
}
interface PluggyInvestment {
  id: string; name: string; type?: string; subtype?: string | null; balance?: number | null; amount?: number | null;
  amountOriginal?: number | null; rate?: number | null; rateType?: string | null; taxes?: number | null; taxes2?: number | null; date?: string | null;
}

async function apiKey(): Promise<string> {
  const res = await fetch(`${BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: process.env.PLUGGY_CLIENT_ID, clientSecret: process.env.PLUGGY_CLIENT_SECRET }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Pluggy: falha na autenticação (${res.status})`);
  return ((await res.json()) as { apiKey: string }).apiKey;
}

async function get<T>(key: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'X-API-KEY': key }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Pluggy: ${path} respondeu ${res.status}`);
  return (await res.json()) as T;
}

async function allPages<T>(key: string, path: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= 50; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const p = await get<Page<T>>(key, `${path}${sep}page=${page}&pageSize=500`);
    out.push(...p.results);
    if (!p.totalPages || page >= p.totalPages) break;
  }
  return out;
}

const day = (iso: string) => iso.slice(0, 10);

async function readItem(key: string, itemId: string, from: string) {
  const item = await get<PluggyItem>(key, `/items/${itemId}`);
  const institution = (item.connector?.name ?? 'Banco').replace(/\s*\(.*\)$/, '');
  const raw = await allPages<PluggyAccount>(key, `/accounts?itemId=${itemId}`);
  const accounts: Account[] = raw.map((a) => ({
    id: a.id,
    institution,
    kind: a.type === 'CREDIT' ? 'credit' : a.subtype === 'SAVINGS_ACCOUNT' ? 'savings' : 'checking',
    name: a.marketingName || a.name,
    balance: a.balance,
    creditLimit: a.creditData?.creditLimit ?? undefined,
  }));
  const transactions: Transaction[] = [];
  for (const a of raw) {
    const txs = await allPages<PluggyTransaction>(key, `/transactions?accountId=${a.id}&from=${from}`);
    for (const t of txs) {
      // No cartão, valor positivo é gasto e negativo é pagamento de fatura (convenção da Pluggy).
      const out = a.type === 'CREDIT' ? t.amount > 0 : t.type === 'DEBIT';
      const cc = t.creditCardMetadata;
      transactions.push({
        id: t.id,
        accountId: a.id,
        date: day(t.date),
        direction: out ? 'out' : 'in',
        amount: Math.abs(t.amount),
        description: t.description,
        installment: cc?.totalInstallments && cc.totalInstallments > 1 ? { number: cc.installmentNumber ?? 1, total: cc.totalInstallments } : undefined,
      });
    }
  }
  const inv = await allPages<PluggyInvestment>(key, `/investments?itemId=${itemId}`);
  const investments: Investment[] = inv.map((i) => {
    const gross = i.balance ?? i.amount ?? 0;
    const tax = (i.taxes ?? 0) + (i.taxes2 ?? 0);
    const rate = i.rateType === 'CDI' && i.rate != null ? (i.rate > 5 ? i.rate / 100 : i.rate) : undefined;
    return { id: i.id, institution, name: i.name, kind: i.subtype || i.type || 'Investimento', rateOfCdi: rate, invested: i.amountOriginal ?? gross, grossValue: gross, netValue: gross - tax, taxEstimate: tax, since: i.date ? day(i.date) : undefined };
  });
  return { accounts, transactions, investments };
}

export async function pluggySnapshot(): Promise<Snapshot> {
  const items = (process.env.PLUGGY_ITEM_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!items.length) throw new Error('Defina PLUGGY_ITEM_IDS com os IDs das suas conexões.');
  const from = process.env.PLUGGY_FROM || `${new Date().getFullYear() - 1}-01-01`;
  const key = await apiKey();
  const parts = await Promise.all(items.map((id) => readItem(key, id, from)));
  const snap: Snapshot = {
    source: 'pluggy',
    generatedAt: new Date().toISOString(),
    accounts: parts.flatMap((p) => p.accounts),
    investments: parts.flatMap((p) => p.investments),
    transactions: parts.flatMap((p) => p.transactions),
  };
  const biz = process.env.PLUGGY_BUSINESS_ITEM_ID;
  if (biz) {
    const b = await readItem(key, biz, `${new Date().getFullYear()}-01-01`);
    snap.business = { accounts: b.accounts, transactions: b.transactions };
  }
  return snap;
}
