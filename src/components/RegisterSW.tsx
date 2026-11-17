'use client';
import { useEffect } from 'react';

/** Registra o service worker para o app poder ser instalado (PWA). */
export function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/sw.js`).catch(() => {});
  }, []);
  return null;
}
