import 'server-only';
import type { Snapshot } from '@/lib/finance/types';
import { todayInBrazil } from '@/lib/finance/dates';
import type { Owner } from '@/lib/finance/categorize';
import { demoSnapshot, DEMO_OWNER } from './demo';
import { pluggySnapshot } from './pluggy';

export type DataSource = 'demo' | 'pluggy';
export const dataSource = (): DataSource => (process.env.DATA_SOURCE === 'pluggy' ? 'pluggy' : 'demo');

let cache: { at: number; snap: Snapshot } | null = null;
const TTL = 15 * 60 * 1000;

/** Lê as contas (com cache de 15 minutos no modo real). */
export async function getSnapshot(force = false): Promise<Snapshot> {
  if (dataSource() === 'demo') return demoSnapshot(todayInBrazil());
  if (!force && cache && Date.now() - cache.at < TTL) return cache.snap;
  const snap = await pluggySnapshot();
  cache = { at: Date.now(), snap };
  return snap;
}

export function getOwner(): Owner {
  if (dataSource() === 'demo') return DEMO_OWNER;
  return { name: process.env.OWNER_NAME || undefined, cnpj: process.env.OWNER_CNPJ || undefined };
}
