import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const config = await db.botConfig.findUnique({ where: { id: 'default' } });
  return NextResponse.json({
    name: config?.name || 'Asistente',
    greeting: config?.greeting || '¡Hola! ¿En qué puedo ayudarte?',
    placeholder: config?.placeholder || 'Escribe tu mensaje...'
  });
}
