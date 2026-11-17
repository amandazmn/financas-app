'use client';
import { useMemo, useState } from 'react';
import type { Snapshot } from '@/lib/finance/types';
import type { Owner } from '@/lib/finance/categorize';
import { computeDashboard, type Dashboard as D } from '@/lib/finance';
import { todayInBrazil } from '@/lib/finance/dates';
import { useSettings, type CustomRule } from '@/lib/useSettings';
import { brl, brl2, money, num1, pct, pct1, percent } from '@/lib/format';
import { Card, Progress, Stat, Table, td, tdr } from './ui';
import { IncomeSpendingChart, InstallmentsChart, ProjectionChart, ReturnsChart } from './charts';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toRules = (rules: CustomRule[]) =>
  rules.filter((r) => r.contains.trim()).map((r) => ({ pattern: new RegExp(escape(r.contains.trim().toUpperCase())), category: r.category, group: r.group, amount: r.amount }));

const TIPS: Record<string, string> = {
  'Restaurantes & lanches': 'Levar marmita ou lanche de casa três vezes por semana já corta boa parte. Delivery é onde o valor mais escapa.',
  Mercado: 'Uma compra grande por semana, com lista, num atacarejo. As idas rápidas ao mercado somam mais do que parecem.',
  'Compras diversas': 'Espere 48 horas antes de comprar o que não é urgente e tire o cartão salvo dos apps de compra.',
  'Roupas & casa': 'Defina um valor fixo por mês e deixe compras maiores para quando o mês fechar com sobra.',
  'Lazer & eventos': 'Separe no começo do mês um valor só para lazer e use só ele.',
  'Beleza & cuidados': 'Espace um pouco as idas ao salão e compre cosméticos em kits ou promoções.',
  Farmácia: 'Peça genéricos e compare preços nos apps das farmácias.',
  'Assinaturas & apps': 'Revise as assinaturas: cancele as que usa pouco ou troque por planos compartilhados.',
  Combustível: 'Abasteça num posto fixo com app de desconto e junte trajetos.',
  'Transporte por app': 'Em trajetos frequentes, compare com transporte público ou carona.',
  Pets: 'Ração em embalagem grande ou por assinatura sai mais barata por quilo.',
  'Pix para pessoas': 'Veja se algum Pix recorrente dá para cortar ou dividir.',
};

export default function Dashboard({ snapshot, owner }: { snapshot: Snapshot; owner: Owner }) {
  const { settings, rules, ready } = useSettings();
  const d = useMemo(() => computeDashboard(snapshot, settings, { today: todayInBrazil(), owner, rules: toRules(rules) }), [snapshot, settings, owner, rules]);
  if (!ready) return <div className="p-8 text-sm text-zinc-500">Carregando…</div>;
  return (
    <div className="space-y-6">
      <Summary d={d} />
      <Alerts d={d} />
      <div className="grid gap-6 lg:grid-cols-5">
        <GoalCard d={d} className="lg:col-span-3" />
        <NextMonthCard d={d} className="lg:col-span-2" />
      </div>
      <Card id="renda-gastos" title="Entradas e gastos por mês" note="O mês atual (*) ainda está em andamento. Transferências entre suas contas, faturas e aplicações não contam como gasto.">
        <IncomeSpendingChart months={d.months} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <BudgetCard d={d} />
        <TipsCard d={d} />
      </div>
      <Heatmap d={d} />
      <Card id="projecao" title="Projeção do patrimônio para 12 meses" note="Soma a sobra de cada mês e o rendimento líquido do CDI. A linha tracejada é a meta.">
        <ProjectionChart rows={d.projection} goal={d.goal.target} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <HoldingsCard d={d} />
        <Card id="parcelas" title="Parcelas já compradas no cartão" note="Quanto das próximas faturas já está comprometido.">
          <InstallmentsChart rows={d.installments} />
        </Card>
      </div>
      <ReturnsCard d={d} />
      {d.mei && <MeiCard mei={d.mei} />}
      <Transactions d={d} />
    </div>
  );
}

function Summary({ d }: { d: D }) {
  const k = d.kpis;
  return (
    <div>
      <p className="mb-4 max-w-3xl text-zinc-600 dark:text-zinc-300">
        Nos últimos 3 meses fechados você recebeu em média <b className="text-zinc-900 dark:text-white">{money(k.avgIncome)}</b> e gastou{' '}
        <b className="text-zinc-900 dark:text-white">{money(k.avgSpending)}</b> por mês, guardando <b className="text-zinc-900 dark:text-white">{percent(k.savingsRate)}</b> do que entrou.
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Patrimônio líquido" value={money(k.netWorth)} sub="Contas e investimentos, menos o cartão" />
        <Stat label="Gasto no mês" value={money(k.spentThisMonth)} tone={k.budgetPct != null && k.budgetPct > 1 ? 'bad' : undefined} sub={`${percent(k.budgetPct)} do teto de ${money(k.budgetTotal)}`} />
        <Stat label="Sobra média" value={money(k.avgBalance)} tone={k.avgBalance < 0 ? 'bad' : undefined} sub="Últimos 3 meses fechados" />
        <Stat label="Reserva de emergência" value={k.reserveMonths == null ? '—' : `${num1.format(k.reserveMonths)} meses`} sub="Do seu gasto médio" />
      </div>
    </div>
  );
}

function Alerts({ d }: { d: D }) {
  const k = d.kpis;
  const items: string[] = [];
  if (k.budgetPct != null && k.budgetPct > 1) items.push(`Este mês você já gastou ${money(k.spentThisMonth)}, acima do teto de ${money(k.budgetTotal)}.`);
  if (k.cardUsage != null && k.cardUsage > 0.8) items.push(`O cartão está com ${percent(k.cardUsage)} do limite usado, e ${money(k.futureInstallments)} são parcelas que ainda vão vencer.`);
  if (k.savingsBalance > 500) items.push(`Você tem ${money(k.savingsBalance)} na poupança. Num CDB/RDB a 120% do CDI renderia cerca de ${money(k.gainLeavingSavings)} a mais por ano.`);
  if (k.reserveMonths != null && k.reserveMonths < 6) items.push(`Sua reserva cobre ${num1.format(k.reserveMonths)} meses de gastos. O recomendado é 6.`);
  if (!items.length) return null;
  return (
    <Card id="alertas" title="Pontos de atenção">
      <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </Card>
  );
}

function GoalCard({ d, className }: { d: D; className?: string }) {
  const g = d.goal;
  const need = g.scenarios[2];
  return (
    <Card id="meta" className={className} title={`Meta: ${money(g.target)} até ${g.deadline}`} note={<>Você tem <b>{money(g.current)}</b> ({percent(g.progress)} da meta). Para chegar no prazo, guarde <b>{money(need.savePerMonth)}</b> por mês, gastando no máximo <b>{money(need.spendPerMonth)}</b>.</>}>
      <Progress value={g.progress} label="Progresso até a meta" />
      <div className="mt-4">
        <Table head={['Cenário', 'Guarda/mês', 'No prazo', 'Chega em']} align={['left', 'right', 'right', 'right']}>
          {g.scenarios.map((s) => (
            <tr key={s.scenario} className={s.scenario === 'Necessário para a meta' ? 'font-medium' : ''}>
              <td className={td}>{s.scenario}</td>
              <td className={tdr}>{money(s.savePerMonth)}</td>
              <td className={`${tdr} ${s.atDeadline < g.target ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{money(s.atDeadline)}</td>
              <td className={tdr}>{s.reachedIn}</td>
            </tr>
          ))}
        </Table>
      </div>
    </Card>
  );
}

function NextMonthCard({ d, className }: { d: D; className?: string }) {
  const n = d.nextMonth;
  return (
    <Card id="proximo" className={className} title={`O que esperar de ${n.label}`}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt className="text-zinc-500">Renda esperada</dt><dd className="text-right tabular-nums">{money(n.income)}</dd>
        <dt className="text-zinc-500">Teto de gastos</dt><dd className="text-right tabular-nums">{money(n.budget)}</dd>
        <dt className="text-zinc-500">Eventuais + extras</dt><dd className="text-right tabular-nums">{money(n.occasional + n.extra)}</dd>
        <dt className="text-zinc-500">Parcelas na fatura</dt><dd className="text-right tabular-nums">{money(n.installments)}</dd>
        <dt className="font-medium">Sobra prevista</dt><dd className={`text-right font-medium tabular-nums ${n.gap < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>{money(n.expectedBalance)}</dd>
        <dt className="text-zinc-500">A meta pede</dt><dd className="text-right tabular-nums">{money(n.goalSaving)}</dd>
      </dl>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        {n.gap < 0 ? `Seguindo o teto, faltam ${money(-n.gap)} para guardar o que a meta pede.` : `Seguindo o teto, sobram ${money(n.gap)} além do que a meta pede.`}
      </p>
    </Card>
  );
}

function BudgetCard({ d }: { d: D }) {
  const rows = [...d.budget].sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.spent - a.spent);
  return (
    <Card id="teto" title="Teto de gastos do mês" note="A marca escura é o teto; a amarela, sua média dos últimos 3 meses.">
      <div className="space-y-2">
        {rows.map((r) => {
          const scale = Math.max(r.limit, r.spent, r.avg3, 1);
          const over = r.limit > 0 && r.spent > r.limit;
          return (
            <div key={r.category} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
              <div className="truncate text-zinc-700 dark:text-zinc-300" title={r.category}>{r.category}</div>
              <div className="relative h-4 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                <div className={`absolute inset-y-0 left-0 rounded-md ${over ? 'bg-rose-400' : 'bg-indigo-400/80'}`} style={{ width: `${(100 * r.spent) / scale}%` }} />
                {r.limit > 0 && <div className="absolute inset-y-0 w-0.5 bg-zinc-900/70 dark:bg-white/70" style={{ left: `${(100 * r.limit) / scale}%` }} />}
                {r.avg3 > 0 && <div className="absolute inset-y-0.5 w-0.5 bg-amber-500" style={{ left: `${(100 * r.avg3) / scale}%` }} />}
              </div>
              <span className={`w-36 text-right text-xs tabular-nums ${over ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-zinc-600 dark:text-zinc-300'}`}>
                {money(r.spent)} de {r.limit > 0 ? money(r.limit) : 'sem teto'}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TipsCard({ d }: { d: D }) {
  return (
    <Card id="dicas" title="Onde dá para economizar" note="Quanto você economizaria por mês voltando ao teto, pela média dos últimos 3 meses.">
      {d.savings.length === 0 ? (
        <p className="text-sm text-zinc-500">Todas as categorias estão dentro do teto. 🎉</p>
      ) : (
        <ul className="space-y-3">
          {d.savings.slice(0, 6).map((s) => (
            <li key={s.category} className="border-l-2 border-emerald-500 pl-3">
              <div className="text-sm font-medium">{s.category} · <span className="text-emerald-600 dark:text-emerald-400">até {money(s.saving)}/mês</span></div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{TIPS[s.category] ?? `Média de ${money(s.avg3)} contra o teto de ${money(s.limit)}.`}</p>
            </li>
          ))}
          <li className="border-l-2 border-indigo-500 pl-3">
            <div className="text-sm font-medium">Guarde primeiro, gaste depois</div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No dia em que a renda cair, transfira o valor da meta ({money(d.goal.scenarios[2].savePerMonth)}) para a aplicação antes de pagar qualquer coisa.</p>
          </li>
        </ul>
      )}
    </Card>
  );
}

function Heatmap({ d }: { d: D }) {
  const months = [...new Set(d.byCategory.map((r) => r.month))].sort();
  const label = Object.fromEntries(d.byCategory.map((r) => [r.month, r.label]));
  const val = (c: string, m: string) => d.byCategory.find((r) => r.category === c && r.month === m)?.amount ?? 0;
  const cats = [...new Set(d.byCategory.map((r) => r.category))].sort((a, b) => months.reduce((s, m) => s + val(b, m), 0) - months.reduce((s, m) => s + val(a, m), 0));
  const max = Math.max(1, ...d.byCategory.map((r) => r.amount));
  const closed = months.filter((m) => m < d.today.slice(0, 7));
  const last = closed.at(-1);
  const prev = closed.slice(-4, -1);
  return (
    <Card id="categorias" title="Gastos por categoria ao longo dos meses" note="Quanto mais forte a cor, maior o gasto. A variação compara o último mês fechado com a média dos 3 anteriores.">
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-zinc-500">
              <th className="px-2 py-2 text-left font-medium">Categoria</th>
              {months.map((m) => <th key={m} className="px-2 py-2 text-right font-medium">{label[m]}{m === d.today.slice(0, 7) ? '*' : ''}</th>)}
              <th className="px-2 py-2 text-right font-medium">Variação</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => {
              const avg = prev.length ? prev.reduce((s, m) => s + val(c, m), 0) / prev.length : 0;
              const u = last ? val(c, last) : 0;
              const change = avg > 0 ? (u - avg) / avg : null;
              return (
                <tr key={c} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="whitespace-nowrap px-2 py-1.5">{c}</td>
                  {months.map((m) => {
                    const v = val(c, m);
                    return (
                      <td key={m} className="whitespace-nowrap px-2 py-1.5 text-right" style={v > 0 ? { background: `rgba(99,102,241,${0.08 + 0.5 * Math.sqrt(v / max)})` } : undefined}>
                        {v > 0 ? brl.format(v) : <span className="text-zinc-400">—</span>}
                      </td>
                    );
                  })}
                  <td className={`whitespace-nowrap px-2 py-1.5 text-right ${change == null ? 'text-zinc-400' : change > 0.1 ? 'text-rose-600 dark:text-rose-400' : change < -0.1 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {change == null ? (u > 0 ? 'novo' : '—') : `${change > 0 ? '↑' : change < 0 ? '↓' : ''} ${pct.format(Math.abs(change))}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function HoldingsCard({ d }: { d: D }) {
  return (
    <Card id="carteira" title="Onde está seu dinheiro">
      <Table head={['Conta ou aplicação', 'Rende', 'Valor']} align={['left', 'left', 'right']}>
        {d.holdings.map((h) => (
          <tr key={h.item}>
            <td className={td}>{h.item}</td>
            <td className={`${td} text-zinc-500`}>{h.yields}</td>
            <td className={`${tdr} ${h.value < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>{money(h.value)}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

function ReturnsCard({ d }: { d: D }) {
  return (
    <Card id="rendimentos" title="Rendimento dos investimentos" note="Quanto cada aplicação já rendeu e quanto rende ao ano com o CDI das premissas.">
      <ReturnsChart rows={d.returns} />
      <div className="mt-4">
        <Table head={['Banco e tipo', 'Aplicado', 'Rendeu', 'IR estimado', 'Líquido', 'Ao ano']} align={['left', 'right', 'right', 'right', 'right', 'right']}>
          {d.returns.map((r) => (
            <tr key={r.item}>
              <td className={td}>{r.item}</td>
              <td className={tdr}>{money(r.invested)}</td>
              <td className={tdr}>{money(r.earned)}{r.earnedPct != null && <span className="text-zinc-500"> ({pct1.format(r.earnedPct)})</span>}</td>
              <td className={tdr}>{money(r.tax)}</td>
              <td className={tdr}>{money(r.net)}</td>
              <td className={tdr}>{r.annualRate == null ? '—' : pct1.format(r.annualRate)}</td>
            </tr>
          ))}
        </Table>
      </div>
    </Card>
  );
}

function MeiCard({ mei }: { mei: NonNullable<D['mei']> }) {
  const s = mei.summary;
  return (
    <Card id="mei" title={`Empresa (MEI) em ${s.year}`} note="A conta da empresa fica fora das finanças pessoais: aqui entra só o que o MEI faturou e pagou.">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Faturado no ano" value={money(s.revenueYtd)} sub={`${percent(s.limitPct)} do limite de ${money(s.limit)}`} tone={s.limitPct > 0.9 ? 'bad' : undefined} />
        <Stat label="Previsto até dezembro" value={money(s.projectedRevenue)} sub={`${percent(s.projectedPct)} do limite`} tone={s.projectedPct > 1 ? 'bad' : undefined} />
        <Stat label="Parte tributável no IR" value={money(s.taxablePart)} sub={`Isenta: ${money(s.exemptPart)}`} />
        <Stat label="IR estimado" value={s.estimatedTax === 0 ? money(0) : 'acima da faixa'} tone={s.estimatedTax === 0 ? 'good' : 'bad'} sub={`Isento até ${money(s.irExemptAnnual)}/ano`} />
      </div>
      <div className="mt-4"><Progress value={s.limitPct} danger={s.limitPct > 0.9} label="Faturamento em relação ao limite do MEI" /></div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        {s.mustFile ? `A parte tributável passa de ${money(s.filingThreshold)}: a declaração de IR é obrigatória.` : `A parte tributável fica abaixo de ${money(s.filingThreshold)}: pela estimativa, a declaração não é obrigatória.`}{' '}
        No ano que vem, faturando {money(s.nextYearRevenue)}, o limite será {money(s.nextYearLimit)}.
      </p>
      <div className="mt-4">
        <Table head={['Mês', 'Faturamento', 'DAS', 'Outras saídas', 'Retirado']} align={['left', 'right', 'right', 'right', 'right']}>
          {mei.months.map((m) => (
            <tr key={m.month}>
              <td className={td}>{m.label}</td>
              <td className={tdr}>{money(m.revenue)}</td>
              <td className={tdr}>{m.das ? money(m.das) : '—'}</td>
              <td className={tdr}>{m.otherOut ? money(m.otherOut) : '—'}</td>
              <td className={tdr}>{money(m.withdrawals)}</td>
            </tr>
          ))}
        </Table>
      </div>
      <p className="mt-3 text-xs text-zinc-500">A tabela serve como relatório mensal de receitas brutas. Estimativa sem escrituração contábil (32% isento para serviços). Não é consultoria contábil.</p>
    </Card>
  );
}

function Transactions({ d }: { d: D }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const cats = useMemo(() => [...new Set(d.entries.map((e) => e.category))].sort(), [d.entries]);
  const rows = d.entries.filter((e) => !e.future && (!cat || e.category === cat) && (!q || e.description.toLowerCase().includes(q.toLowerCase()))).slice(0, 60);
  return (
    <Card id="lancamentos" title="Lançamentos" note="Os mais recentes, com a categoria de cada um. Para corrigir uma categoria, crie uma regra em Ajustes.">
      <div className="mb-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar descrição" className="min-w-48 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-1.5 text-sm dark:border-zinc-700" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-lg border border-zinc-300 bg-transparent px-3 py-1.5 text-sm dark:border-zinc-700">
          <option value="">Todas as categorias</option>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <Table head={['Data', 'Descrição', 'Categoria', 'Conta', 'Valor']} align={['left', 'left', 'left', 'left', 'right']}>
        {rows.map((e) => (
          <tr key={e.id}>
            <td className={`${td} whitespace-nowrap text-zinc-500`}>{e.date.slice(8, 10)}/{e.date.slice(5, 7)}</td>
            <td className={td}>{e.description}</td>
            <td className={td}><span className="whitespace-nowrap rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">{e.category}</span></td>
            <td className={`${td} whitespace-nowrap text-zinc-500`}>{e.accountName}</td>
            <td className={`${tdr} ${e.signed > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{brl2.format(e.signed)}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

export function SourceBadge({ source }: { source: 'demo' | 'pluggy' }) {
  return source === 'demo' ? (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Demo · dados fictícios</span>
  ) : (
    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Open Finance · Pluggy</span>
  );
}

