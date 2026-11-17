import type { ReactNode } from 'react';

export function Card({ id, title, note, children, className = '' }: { id?: string; title?: ReactNode; note?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      {title && <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>}
      {note && <p className="mt-1 mb-4 text-sm text-zinc-500 dark:text-zinc-400">{note}</p>}
      {!note && title && <div className="mb-4" />}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'bad' | 'good' }) {
  const color = tone === 'bad' ? 'text-rose-600 dark:text-rose-400' : tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-50';
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{sub}</div>}
    </div>
  );
}

export function Progress({ value, danger = false, label }: { value: number; danger?: boolean; label: string }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" role="progressbar" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${danger ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function Table({ head, children, align }: { head: string[]; children: ReactNode; align?: ('left' | 'right')[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {head.map((h, i) => <th key={h} className={`px-2 py-2 font-medium ${align?.[i] === 'right' ? 'text-right' : ''}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{children}</tbody>
      </table>
    </div>
  );
}

export const td = 'px-2 py-2';
export const tdr = 'px-2 py-2 text-right whitespace-nowrap';
