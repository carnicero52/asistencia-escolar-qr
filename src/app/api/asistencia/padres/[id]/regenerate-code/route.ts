import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// POST - Regenerar código de vinculación
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Buscar padre
    const padre = await db.padreTelegram.findUnique({
      where: { id }
    });

    if (!padre) {
      return NextResponse.json({ error: 'Padre no encontrado' }, { status: 404 });
    }

    // Generar nuevo código
    const codigoVinculacion = randomUUID().substring(0, 8).toUpperCase();

    // Actualizar padre
    await db.padreTelegram.update({
      where: { id },
      data: {
        codigoVinculacion,
        codigoExpira: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Obtener configuración
    const config = await db.configAsistencia.findUnique({
      where: { id: 'default' }
    });

    const botUsername = config?.telegramBotUsername || '';
    const botUrl = botUsername 
      ? `https://t.me/${botUsername.replace('@', '')}?start=${codigoVinculacion}`
      : '';

    return NextResponse.json({
      success: true,
      codigo: codigoVinculacion,
      botUrl,
      botUsername,
      expira: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error al regenerar código:', error);
    return NextResponse.json({ error: 'Error al regenerar código' }, { status: 500 });
  }
}
