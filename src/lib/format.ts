export const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const brl2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });
export const pct1 = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const num1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const money = (v: number | null | undefined) => (v == null ? '—' : brl.format(v));
export const percent = (v: number | null | undefined) => (v == null ? '—' : pct.format(v));
