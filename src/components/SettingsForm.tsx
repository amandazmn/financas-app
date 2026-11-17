'use client';
import { useEffect, useState } from 'react';
import type { Budget, Group, Settings } from '@/lib/finance/types';
import { addMonths, monthOf, shortLabel, todayInBrazil } from '@/lib/finance/dates';
import { useSettings, type CustomRule, type Stored } from '@/lib/useSettings';
import { brl } from '@/lib/format';
import { Card } from './ui';

const GROUPS: Group[] = ['Moradia & contas', 'Alimentação', 'Saúde', 'Transporte', 'Pessoal', 'Assinaturas', 'Lazer', 'Compras', 'Outros'];
const input = 'w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-1.5 text-sm tabular-nums dark:border-zinc-700';

function Num({ label, value, onChange, step = 1, hint }: { label: string; value: number; onChange: (v: number) => void; step?: number; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <input type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} className={`mt-1 ${input}`} />
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export default function SettingsForm() {
  const { settings, rules, ready, save, reset } = useSettings();
  const [draft, setDraft] = useState<Stored>({ settings, rules });
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (ready) setDraft({ settings, rules }); }, [ready, settings, rules]);
  if (!ready) return <div className="p-8 text-sm text-zinc-500">Carregando…</div>;

  const s = draft.settings;
  const a = s.assumptions;
  const set = (next: Partial<Settings['assumptions']>) => { setSaved(false); setDraft({ ...draft, settings: { ...s, assumptions: { ...a, ...next } } }); };
  const setBudgets = (budgets: Budget[]) => { setSaved(false); setDraft({ ...draft, settings: { ...s, budgets } }); };
  const setRules = (r: CustomRule[]) => { setSaved(false); setDraft({ ...draft, rules: r }); };
  const months = Array.from({ length: 6 }, (_, i) => addMonths(monthOf(todayInBrazil()), i));
  const total = s.budgets.reduce((x, b) => x + (b.limit || 0), 0);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <button onClick={() => { save(draft); setSaved(true); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Salvar</button>
        <button onClick={() => { if (confirm('Voltar às configurações iniciais?')) reset(); }} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">Restaurar padrão</button>
        {saved && <span className="text-sm text-emerald-600">Salvo neste navegador.</span>}
      </div>

      <Card title="Renda e meta" note="Usadas nas projeções e no cálculo de quanto guardar por mês.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Num label="Renda mensal esperada (R$)" value={a.expectedIncome} onChange={(v) => set({ expectedIncome: v })} />
          <Num label="Meta de patrimônio (R$)" value={a.goalAmount} onChange={(v) => set({ goalAmount: v })} step={1000} />
          <Num label="Prazo: mês (1–12)" value={a.goalMonth} onChange={(v) => set({ goalMonth: Math.min(12, Math.max(1, v)) })} />
          <Num label="Prazo: ano" value={a.goalYear} onChange={(v) => set({ goalYear: v })} />
          <Num label="Reserva para eventuais (R$/mês)" value={a.occasionalExpenses} onChange={(v) => set({ occasionalExpenses: v })} hint="Gastos sem teto que vêm de vez em quando." />
          <Num label="Reserva de emergência (meses)" value={a.reserveMonths} onChange={(v) => set({ reserveMonths: v })} />
          <Num label="CDI ao ano" value={a.cdiAnnual} step={0.0025} onChange={(v) => set({ cdiAnnual: v })} hint="0,1365 = 13,65%" />
          <Num label="Rendimento médio (fração do CDI)" value={a.pctCdi} step={0.05} onChange={(v) => set({ pctCdi: v })} hint="1,1 = 110% do CDI" />
        </div>
      </Card>

      <Card title="Gastos extras previstos" note="Festas, viagens, presentes: valores acima do teto em meses específicos.">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {months.map((m) => <Num key={m} label={shortLabel(m)} value={a.extras[m] ?? 0} step={50} onChange={(v) => set({ extras: { ...a.extras, [m]: v } })} />)}
        </div>
      </Card>

      <Card title={`Teto por categoria · total ${brl.format(total)}`} note="Use o mesmo nome de categoria que aparece nos lançamentos.">
        <div className="space-y-2">
          {s.budgets.map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_11rem_7rem_2rem] items-center gap-2">
              <input value={b.category} onChange={(e) => setBudgets(s.budgets.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))} className={input} aria-label="Categoria" />
              <select value={b.group} onChange={(e) => setBudgets(s.budgets.map((x, j) => (j === i ? { ...x, group: e.target.value as Group } : x)))} className={input} aria-label="Grupo">
                {GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
              <input type="number" value={b.limit} onChange={(e) => setBudgets(s.budgets.map((x, j) => (j === i ? { ...x, limit: Number(e.target.value) } : x)))} className={input} aria-label="Teto" />
              <button onClick={() => setBudgets(s.budgets.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-rose-600" aria-label="Remover">✕</button>
            </div>
          ))}
          <button onClick={() => setBudgets([...s.budgets, { category: 'Nova categoria', group: 'Outros', limit: 0 }])} className="text-sm text-indigo-600 hover:underline">+ Adicionar categoria</button>
        </div>
      </Card>

      <Card title="Regras de categoria" note="Corrija categorias: lançamentos cuja descrição contém o texto vão para a categoria escolhida. O valor exato é opcional (útil para Pix recorrentes).">
        <div className="space-y-2">
          {draft.rules.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_7rem_2rem] items-center gap-2">
              <input value={r.contains} placeholder="Texto na descrição" onChange={(e) => setRules(draft.rules.map((x, j) => (j === i ? { ...x, contains: e.target.value } : x)))} className={input} />
              <input value={r.category} placeholder="Categoria" list="cats" onChange={(e) => {
                const g = s.budgets.find((b) => b.category === e.target.value)?.group ?? r.group;
                setRules(draft.rules.map((x, j) => (j === i ? { ...x, category: e.target.value, group: g } : x)));
              }} className={input} />
              <input type="number" value={r.amount ?? ''} placeholder="Valor" onChange={(e) => setRules(draft.rules.map((x, j) => (j === i ? { ...x, amount: e.target.value === '' ? undefined : Number(e.target.value) } : x)))} className={input} />
              <button onClick={() => setRules(draft.rules.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-rose-600" aria-label="Remover">✕</button>
            </div>
          ))}
          <datalist id="cats">{s.budgets.map((b) => <option key={b.category} value={b.category} />)}</datalist>
          <button onClick={() => setRules([...draft.rules, { contains: '', category: '', group: 'Outros' }])} className="text-sm text-indigo-600 hover:underline">+ Adicionar regra</button>
        </div>
      </Card>

      <Card title="Empresa (MEI)" note="Para o acompanhamento do limite de faturamento e a estimativa de IR.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Num label="Faturamento mensal esperado (R$)" value={a.mei.expectedMonthlyRevenue} onChange={(v) => set({ mei: { ...a.mei, expectedMonthlyRevenue: v } })} />
          <Num label="DAS mensal (R$)" value={a.mei.monthlyDas} step={0.01} onChange={(v) => set({ mei: { ...a.mei, monthlyDas: v } })} />
          <Num label="Parte isenta sem contabilidade" value={a.mei.presumption} step={0.01} onChange={(v) => set({ mei: { ...a.mei, presumption: v } })} hint="0,32 para serviços" />
          <Num label="Limite para declarar IR (R$)" value={a.mei.filingThreshold} onChange={(v) => set({ mei: { ...a.mei, filingThreshold: v } })} hint="Atualize quando a Receita publicar." />
        </div>
      </Card>
    </div>
  );
}
