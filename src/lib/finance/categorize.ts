import type { Account, CategoryRule, Entry, ISODate, Transaction } from './types';
import { monthOf } from './dates';

export interface Owner {
  /** Nome do titular, para reconhecer transferências entre as próprias contas. */
  name?: string;
  /** CNPJ do MEI do titular (só dígitos ou formatado), para reconhecer a renda. */
  cnpj?: string;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Regras que dependem do titular: renda vinda do próprio CNPJ e transferências entre contas. */
export function ownerRules(owner: Owner): CategoryRule[] {
  const rules: CategoryRule[] = [];
  if (owner.cnpj) {
    const d = owner.cnpj.replace(/\D/g, '');
    // Bancos mostram o CNPJ inteiro ou só a raiz, com ou sem pontuação.
    const root = d.slice(0, 8);
    const formatted = `${root.slice(0, 2)}.${root.slice(2, 5)}.${root.slice(5, 8)}`;
    rules.push({ pattern: new RegExp(`${escape(formatted)}|${root}`), category: 'Renda (retirada do MEI)', group: 'Renda', direction: 'in' });
  }
  if (owner.name) {
    const firstTwo = owner.name.trim().split(/\s+/).slice(0, 2).join(' ').toUpperCase();
    const short = firstTwo.length > 10 ? firstTwo.slice(0, 10) : firstTwo;
    rules.push({ pattern: new RegExp(escape(short)), category: 'Transferência entre contas', group: 'Interno' });
  }
  return rules;
}

/**
 * Regras genéricas por palavra-chave, testadas contra a descrição em maiúsculas.
 * A primeira que casar vence, então as mais específicas vêm antes.
 */
export const defaultRules: CategoryRule[] = [
  { pattern: /PAGAMENTO DE FATURA|PAGAMENTO RECEBIDO|PGTO FATURA|TRANSF\.?POUP/, category: 'Transferência entre contas', group: 'Interno' },
  { pattern: /APLICA(Ç|C)(Ã|A)O|APLIC\.? (RDB|CDB)/, category: 'Aplicação em investimentos', group: 'Investimento' },
  { pattern: /RESGATE|RESG\/VENCTO/, category: 'Resgate de investimentos', group: 'Investimento' },
  { pattern: /RENDIMENTO|RENTAB/, category: 'Rendimentos', group: 'Outras entradas', direction: 'in' },
  { pattern: /SALARIO|SALÁRIO|PROVENTOS/, category: 'Salário', group: 'Renda', direction: 'in' },
  { pattern: /RECEITA FED|RESTITUI/, category: 'Restituição de IR', group: 'Outras entradas', direction: 'in' },
  { pattern: /CONDOMINIO|CONDOMÍNIO|ALUGUEL|IMOBILIARIA/, category: 'Moradia', group: 'Moradia & contas' },
  { pattern: /ENERGIA|LUZ|CELESC|CEMIG|ENEL|COPEL|LIGHT S/, category: 'Energia', group: 'Moradia & contas' },
  { pattern: /SANEAMENTO|SABESP|CASAN|SAMAE|AGUA /, category: 'Água', group: 'Moradia & contas' },
  { pattern: /FIBRA|INTERNET|NET SERVICOS|VIVO FIBRA|CLARO NET/, category: 'Internet', group: 'Moradia & contas' },
  { pattern: /TIM S\.?A|CLARO S\.?A|VIVO S\.?A|TELEFONICA|OI MOVEL|CELULAR/, category: 'Celular', group: 'Moradia & contas' },
  { pattern: /UNIMED|AMIL|BRADESCO SAUDE|SULAMERICA|HAPVIDA|PLANO DE SAUDE|SAUDE /, category: 'Plano de saúde', group: 'Saúde' },
  { pattern: /PSICOLOG|TERAPIA|MENTAL/, category: 'Terapia', group: 'Saúde' },
  { pattern: /DROGARIA|FARMACIA|FARMÁCIA|PANVEL|RAIA|PACHECO|PAGUE MENOS/, category: 'Farmácia', group: 'Saúde' },
  { pattern: /ACADEMIA|SMART ?FIT|PILATES|CROSSFIT|GYMPASS|WELLHUB/, category: 'Academia & esportes', group: 'Saúde' },
  { pattern: /SALAO|SALÃO|BARBEARIA|COSMETIC|BOTICARIO|NATURA|SEPHORA/, category: 'Beleza & cuidados', group: 'Pessoal' },
  { pattern: /POSTO|IPIRANGA|SHELL|PETROBRAS|COMBUSTIVEL/, category: 'Combustível', group: 'Transporte' },
  { pattern: /UBER|99 ?APP|99POP|CABIFY/, category: 'Transporte por app', group: 'Transporte' },
  { pattern: /ESTACIONAMENTO|PARKING|ZONA AZUL/, category: 'Estacionamento', group: 'Transporte' },
  { pattern: /AUTO ?PECAS|MECANICA|OFICINA|PNEU/, category: 'Manutenção do carro', group: 'Transporte' },
  { pattern: /SPOTIFY|NETFLIX|DISNEY|APPLE\.COM|GOOGLE ?ONE|PRIME VIDEO|AMAZON PRIME|HBO|MAX |YOUTUBE|CLAUDE|OPENAI|IOF/, category: 'Assinaturas & apps', group: 'Assinaturas' },
  { pattern: /IFOOD|RAPPI|RESTAURANTE|LANCHONETE|BURGER|PIZZ|CAFE|CAFÉ|PADARIA|SORVET|MC ?DONALD|ARCOS DOURADOS|BAR /, category: 'Restaurantes & lanches', group: 'Alimentação' },
  { pattern: /SUPERMERC|MERCADO(?!LIVRE| ?PAGO)|ATACAD|ASSAI|ATACADAO|CARREFOUR|HORTIFRUTI|ACOUGUE|SACOLAO/, category: 'Mercado', group: 'Alimentação' },
  { pattern: /PET ?SHOP|PETZ|COBASI|VETERIN|AGROPECUARIA/, category: 'Pets', group: 'Pessoal' },
  { pattern: /PAROQUIA|IGREJA|DOAC|DOAÇ/, category: 'Doações', group: 'Pessoal' },
  { pattern: /CINEMA|INGRESSO|SYMPLA|TEATRO|SHOW|BOLICHE|PARQUE|LOTERI/, category: 'Lazer & eventos', group: 'Lazer' },
  { pattern: /RENNER|C&A|CEA |RIACHUELO|ZARA|SHEIN|HERING|CALCAD|MODA/, category: 'Roupas & casa', group: 'Compras' },
  { pattern: /AMAZON|MERCADOLIVRE|MERCADO LIVRE|SHOPEE|ALIEXPRESS|MAGALU|AMERICANAS|PAGSEGURO|PAGBANK|CAPPTA|STONE|CIELO|SUMUP|MERCADO ?PAGO|PAGAR\.ME/, category: 'Compras diversas', group: 'Compras' },
  { pattern: /PIX|TRANSFER|TED|DOC /, category: 'Pix para pessoas', group: 'Outros', direction: 'out' },
];

/** Nome curto da conta para exibir: "Cartão Nubank", "Bradesco poupança"… */
export function accountLabel(a: Account): string {
  if (a.kind === 'credit') return `Cartão ${a.institution}`;
  if (a.kind === 'savings') return `${a.institution} poupança`;
  return `${a.institution} conta`;
}

/** Limpa prefixos de banco das descrições para leitura. */
export function cleanDescription(d: string): string {
  return d
    .replace(/^Compra no débito\|/i, '')
    .replace(/^COMPRA (ELO DEBITO VISTA|DEBITO APP ELO) - /, '')
    .replace(/ - DOCTO:.*$/, '')
    .replace(/^Transferência enviada pelo Pix\|?/i, 'Pix ')
    .replace(/^PIX (QR CODE (DINAMICO|ESTATICO)|ENVIADO) - DES:? +/, 'Pix ')
    .replace(/^PIX RECEBIDO - REM:? +/, 'Pix de ')
    .replace(/ +\d{2}\/\d{2}$/, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface CategorizeOptions {
  today: ISODate;
  owner?: Owner;
  /** Regras extras, testadas antes das padrão. */
  rules?: CategoryRule[];
}

/** Dá a cada transação uma categoria, um grupo, o mês e o nome da conta. Ordena da mais recente para a mais antiga. */
export function categorize(transactions: Transaction[], accounts: Account[], opts: CategorizeOptions): Entry[] {
  const names = new Map(accounts.map((a) => [a.id, accountLabel(a)]));
  const rules = [...(opts.rules ?? []), ...ownerRules(opts.owner ?? {}), ...defaultRules];
  return transactions
    .filter((t) => names.has(t.accountId))
    .map((t): Entry => {
      const text = t.description.toUpperCase();
      let category = t.direction === 'in' ? 'Outras entradas' : 'Outros gastos';
      let group: Entry['group'] = t.direction === 'in' ? 'Outras entradas' : 'Outros';
      for (const r of rules) {
        if (r.direction && r.direction !== t.direction) continue;
        if (r.amount != null && Math.abs(r.amount - t.amount) > 0.005) continue;
        if (r.pattern.test(text)) { category = r.category; group = r.group; break; }
      }
      const desc = cleanDescription(t.description);
      const inst = t.installment && t.installment.total > 1 ? `${t.installment.number}/${t.installment.total}` : '';
      return {
        ...t,
        description: inst && !desc.includes(inst) ? `${desc} (${inst})` : desc,
        month: monthOf(t.date),
        future: t.date > opts.today,
        category,
        group,
        accountName: names.get(t.accountId) ?? '',
        signed: t.direction === 'in' ? t.amount : -t.amount,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Grupos que não são gasto (renda, transferências, aplicações). */
export const NON_SPENDING = new Set<Entry['group']>(['Renda', 'Outras entradas', 'Interno', 'Investimento']);

export const isSpending = (e: Entry) => !e.future && e.direction === 'out' && !NON_SPENDING.has(e.group);
