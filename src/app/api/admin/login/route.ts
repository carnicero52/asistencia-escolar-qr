import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  
  const config = await db.botConfig.findUnique({ where: { id: 'default' } });
  const correctPassword = config?.password || 'admin123';

  if (password === correctPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Contraseña incorrecta' });
}
