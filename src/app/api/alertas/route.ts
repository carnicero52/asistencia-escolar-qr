import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener alertas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const soloNoLeidas = searchParams.get('noLeidas') === 'true';

    const alertas = await db.alerta.findMany({
      where: soloNoLeidas ? { leida: false } : {},
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json(alertas);
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    return NextResponse.json({ error: 'Error al obtener alertas' }, { status: 500 });
  }
}

// PUT - Marcar alerta como leída
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    if (data.marcarTodas) {
      await db.alerta.updateMany({
        where: { leida: false },
        data: { leida: true }
      });
      return NextResponse.json({ success: true, mensaje: 'Todas las alertas marcadas como leídas' });
    }

    const alerta = await db.alerta.update({
      where: { id: data.id },
      data: { leida: true }
    });

    return NextResponse.json(alerta);
  } catch (error) {
    console.error('Error al actualizar alerta:', error);
    return NextResponse.json({ error: 'Error al actualizar alerta' }, { status: 500 });
  }
}
