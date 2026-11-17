import { NextResponse, type NextRequest } from 'next/server';

/**
 * No modo real (DATA_SOURCE=pluggy), o app inteiro fica atrás de uma senha (HTTP Basic Auth).
 * No modo demo ele é público.
 */
export function proxy(req: NextRequest) {
  if (process.env.DATA_SOURCE !== 'pluggy') return NextResponse.next();
  const password = process.env.APP_PASSWORD;
  if (!password) return new NextResponse('Defina APP_PASSWORD para usar o modo real.', { status: 500 });
  const header = req.headers.get('authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const given = atob(encoded).split(':').slice(1).join(':');
    if (given.length === password.length && given === password) return NextResponse.next();
  }
  return new NextResponse('Autenticação necessária', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Finanças", charset="UTF-8"' } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.svg|manifest.webmanifest|sw.js).*)'],
};
