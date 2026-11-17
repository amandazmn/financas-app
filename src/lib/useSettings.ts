'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Group, Settings } from '@/lib/finance/types';
import { defaultSettings } from '@/config/defaults';

/** Regra criada pela pessoa: descrição que contém um texto (e, opcionalmente, um valor exato) vai para uma categoria. */
export interface CustomRule { contains: string; category: string; group: Group; amount?: number }

export interface Stored { settings: Settings; rules: CustomRule[] }

const KEY = 'financas-app:v1';

function load(): Stored {
  const base: Stored = { settings: defaultSettings(), rules: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<Stored>;
    return {
      settings: {
        budgets: saved.settings?.budgets ?? base.settings.budgets,
        assumptions: { ...base.settings.assumptions, ...saved.settings?.assumptions, mei: { ...base.settings.assumptions.mei, ...saved.settings?.assumptions?.mei } },
      },
      rules: saved.rules ?? [],
    };
  } catch {
    return base;
  }
}

/** Configurações e regras guardadas no navegador. */
export function useSettings() {
  const [state, setState] = useState<Stored>(() => ({ settings: defaultSettings(), rules: [] }));
  const [ready, setReady] = useState(false);
  useEffect(() => { setState(load()); setReady(true); }, []);
  const save = useCallback((next: Stored) => {
    setState(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* armazenamento indisponível */ }
  }, []);
  const reset = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setState({ settings: defaultSettings(), rules: [] });
  }, []);
  return { ...state, ready, save, reset };
}
