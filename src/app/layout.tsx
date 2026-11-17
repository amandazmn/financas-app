import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { dataSource } from '@/lib/data';
import { SourceBadge } from '@/components/Dashboard';
import { RegisterSW } from '@/components/RegisterSW';

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: 'Finanças · painel pessoal',
  description: 'Teto de gastos, meta de patrimônio, projeções e controle de MEI com dados do Open Finance.',
  manifest: `${base}/manifest.webmanifest`,
  icons: { icon: `${base}/icon.svg`, apple: `${base}/icon.svg` },
};

export const viewport: Viewport = { themeColor: '#4f46e5', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <img src={`${base}/icon.svg`} alt="" width={28} height={28} />
              Finanças
            </Link>
            <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-300">
              <Link href="/" className="hover:text-indigo-600">Painel</Link>
              <Link href="/ajustes" className="hover:text-indigo-600">Ajustes</Link>
            </nav>
            <div className="ml-auto"><SourceBadge source={dataSource()} /></div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-zinc-500">
          Organização financeira pessoal. Não é recomendação de investimento nem consultoria contábil.
        </footer>
        <RegisterSW />
      </body>
    </html>
  );
}
