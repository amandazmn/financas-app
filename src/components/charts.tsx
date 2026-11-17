'use client';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import type { Dashboard } from '@/lib/finance';
import { brl, pct1 } from '@/lib/format';

const C = { income: '#6366f1', spend: '#f97316', budget: '#6366f1', pace: '#f97316', ref: '#a1a1aa', muted: '#a1a1aa' };
const axis = { fontSize: 12, fill: '#71717a' };
const money = (v: unknown) => brl.format(Number(v));
const tooltipStyle = { borderRadius: 12, borderColor: '#e4e4e7', fontSize: 13 };

export function IncomeSpendingChart({ months }: { months: Dashboard['months'] }) {
  const data = months.map((m) => ({ ...m, name: m.label + (m.current ? '*' : ''), entradas: m.income + m.otherIncome, gastos: m.spending }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e4e4e7" strokeOpacity={0.6} />
        <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={money} width={80} />
        <Tooltip formatter={money} contentStyle={tooltipStyle} cursor={{ fill: 'rgba(161,161,170,0.12)' }} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="entradas" name="Entradas" fill={C.income} radius={[4, 4, 0, 0]} />
        <Bar dataKey="gastos" name="Gastos" fill={C.spend} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProjectionChart({ rows, goal }: { rows: Dashboard['projection']; goal: number }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={rows} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e4e4e7" strokeOpacity={0.6} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={money} width={80} />
        <Tooltip formatter={money} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <ReferenceLine y={goal} stroke={C.ref} strokeDasharray="4 4" label={{ value: 'Meta', position: 'insideTopLeft', fontSize: 12, fill: '#71717a' }} />
        <Line type="monotone" dataKey="withBudget" name="Seguindo o teto" stroke={C.budget} strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="currentPace" name="Ritmo atual" stroke={C.pace} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function InstallmentsChart({ rows }: { rows: Dashboard['installments'] }) {
  if (!rows.length) return <p className="text-sm text-zinc-500">Nenhuma parcela futura.</p>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip formatter={money} contentStyle={tooltipStyle} cursor={{ fill: 'rgba(161,161,170,0.12)' }} />
        <Bar dataKey="amount" name="Parcelas" fill={C.spend} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReturnsChart({ rows }: { rows: Dashboard['returns'] }) {
  const data = rows.filter((r) => r.annualRate != null).map((r) => ({ name: r.item, taxa: r.annualRate as number, poupanca: /Poupan/.test(r.item) }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 8, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" tick={axis} tickLine={false} axisLine={false} width={230} />
        <Tooltip formatter={(v) => `${pct1.format(Number(v))} ao ano`} contentStyle={tooltipStyle} cursor={{ fill: 'rgba(161,161,170,0.12)' }} />
        <Bar dataKey="taxa" name="Rende ao ano" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: unknown) => pct1.format(Number(v)), fontSize: 12, fill: '#71717a' }}>
          {data.map((d) => <Cell key={d.name} fill={d.poupanca ? C.muted : C.income} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
