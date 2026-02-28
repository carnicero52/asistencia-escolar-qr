import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Listar notificaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const estudianteId = searchParams.get('estudianteId');
    const limite = parseInt(searchParams.get('limite') || '50');

    const where: any = {};
    if (tipo) where.tipo = tipo;
    if (estudianteId) where.estudianteId = estudianteId;

    const notificaciones = await db.notificacionAsistencia.findMany({
      where,
      include: {
        estudiante: {
          select: {
            nombre: true,
            apellido: true,
            matricula: true,
            grupo: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limite
    });

    // Estadísticas
    const stats = {
      total: notificaciones.length,
      enviados: notificaciones.filter(n => n.enviado).length,
      errores: notificaciones.filter(n => !n.enviado).length,
      porTipo: {
        RETARDO: notificaciones.filter(n => n.tipo === 'RETARDO').length,
        AUSENCIA: notificaciones.filter(n => n.tipo === 'AUSENCIA').length,
        ENTRADA: notificaciones.filter(n => n.tipo === 'ENTRADA').length
      },
      porCanal: {
        EMAIL_PADRE: notificaciones.filter(n => n.canal === 'EMAIL_PADRE').length,
        EMAIL_MADRE: notificaciones.filter(n => n.canal === 'EMAIL_MADRE').length,
        TELEGRAM_PADRE: notificaciones.filter(n => n.canal === 'TELEGRAM_PADRE').length,
        TELEGRAM_MADRE: notificaciones.filter(n => n.canal === 'TELEGRAM_MADRE').length,
        TELEGRAM_GRUPO: notificaciones.filter(n => n.canal === 'TELEGRAM_GRUPO').length
      }
    };

    return NextResponse.json({ notificaciones, stats });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
  }
}
