import SettingsForm from '@/components/SettingsForm';

export const metadata = { title: 'Ajustes · Finanças' };

export default function AjustesPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Ajustes</h1>
      <p className="mb-4 text-sm text-zinc-500">Tetos, meta, gastos extras e regras de categoria. Ficam salvos só neste navegador.</p>
      <SettingsForm />
    </div>
  );
}
