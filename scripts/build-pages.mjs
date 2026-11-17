// Gera a versão estática (só demo) para o GitHub Pages.
// ATENÇÃO: altera os arquivos no lugar (remove a senha e a API, que só existem com servidor).
// Rode no CI ou numa cópia descartável do projeto:
//   NEXT_PUBLIC_BASE_PATH=/financas-app node scripts/build-pages.mjs
import { rmSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (!process.env.CI && !process.argv.includes('--yes')) {
  console.error('Este script altera arquivos do projeto. Rode no CI ou use --yes numa cópia descartável.');
  process.exit(1);
}
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

rmSync('src/proxy.ts', { force: true });
rmSync('src/app/api', { recursive: true, force: true });
const page = 'src/app/page.tsx';
writeFileSync(page, readFileSync(page, 'utf8').replace("export const dynamic = 'force-dynamic';", "export const dynamic = 'force-static';"));
const manifestPath = 'public/manifest.webmanifest';
const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
m.start_url = `${base}/`;
m.icons = m.icons.map((i) => ({ ...i, src: `${base}${i.src}` }));
writeFileSync(manifestPath, JSON.stringify(m, null, 2));

execSync('npx next build', { stdio: 'inherit', env: { ...process.env, PAGES_EXPORT: '1', DATA_SOURCE: 'demo', NEXT_TELEMETRY_DISABLED: '1' } });
writeFileSync('out/.nojekyll', '');
console.log('Site estático em ./out');
