import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const config = await db.botConfig.findUnique({ where: { id: 'default' } });
  return NextResponse.json({
    name: config?.name || 'Asistente',
    greeting: config?.greeting || '¡Hola! ¿En qué puedo ayudarte?',
    placeholder: config?.placeholder || 'Escribe tu mensaje...',
    password: ''
  });
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  
  const updateData: Record<string, string> = {
    name: data.name,
    greeting: data.greeting,
    placeholder: data.placeholder,
  };

  // Only update password if provided
  if (data.password && data.password.trim()) {
    updateData.password = data.password;
  }

  const config = await db.botConfig.upsert({
    where: { id: 'default' },
    update: updateData,
    create: {
      id: 'default',
      ...updateData,
      password: data.password || 'admin123'
    }
  });

  return NextResponse.json({ success: true, config });
}
