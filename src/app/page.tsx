import Dashboard from '@/components/Dashboard';
import { getOwner, getSnapshot } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  try {
    const snapshot = await getSnapshot();
    return <Dashboard snapshot={snapshot} owner={getOwner()} />;
  } catch (e) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
        <p className="font-medium">Não foi possível ler as contas.</p>
        <p className="mt-1">{e instanceof Error ? e.message : String(e)}</p>
      </div>
    );
  }
}
