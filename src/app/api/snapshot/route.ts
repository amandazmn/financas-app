import { NextResponse } from 'next/server';
import { getSnapshot } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Dados normalizados das contas (útil para depurar ou para outro cliente). Protegido por senha no modo real. */
export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.has('refresh');
  try {
    return NextResponse.json(await getSnapshot(force));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
