import { db } from '@/lib/database';
import { verifyAdminSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET - Estadísticas del dashboard
export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const negocioId = await verifyAdminSession(token);

  if (!negocioId) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }

  try {
    // Obtener estadísticas en paralelo
    const [
      totalClientes,
      totalCompras,
      recompensasPendientes,
      recompensasCanjeadas,
      comprasRecientes,
      clientesConMasCompras,
    ] = await Promise.all([
      // Total clientes
      db.cliente.count({
        where: { negocioId, activo: true },
      }),
      // Total compras
      db.compra.count({
        where: { negocioId },
      }),
      // Recompensas pendientes
      db.cliente.aggregate({
        where: { negocioId, activo: true },
        _sum: { recompensasPendientes: true },
      }),
      // Recompensas canjeadas
      db.cliente.aggregate({
        where: { negocioId, activo: true },
        _sum: { recompensasCanjeadas: true },
      }),
      // Compras recientes (últimas 5)
      db.compra.findMany({
        where: { negocioId },
        orderBy: { fecha: 'desc' },
        take: 5,
        include: {
          cliente: {
            select: { nombre: true, email: true },
          },
        },
      }),
      // Top 5 clientes con más compras
      db.cliente.findMany({
        where: { negocioId, activo: true },
        orderBy: { comprasTotal: 'desc' },
        take: 5,
        select: {
          id: true,
          nombre: true,
          email: true,
          comprasTotal: true,
          recompensasPendientes: true,
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalClientes,
        totalCompras,
        recompensasPendientes: recompensasPendientes._sum.recompensasPendientes || 0,
        recompensasCanjeadas: recompensasCanjeadas._sum.recompensasCanjeadas || 0,
      },
      comprasRecientes,
      clientesConMasCompras,
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// PUT - Actualizar configuración del negocio
export async function PUT(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const negocioId = await verifyAdminSession(token);

  if (!negocioId) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      nombre,
      telefono,
      direccion,
      descripcion,
      telegramToken,
      telegramChatId,
      telegramActivo,
    } = body;

    const negocio = await db.negocio.update({
      where: { id: negocioId },
      data: {
        nombre,
        telefono: telefono || null,
        direccion: direccion || null,
        descripcion: descripcion || null,
        telegramToken: telegramToken || null,
        telegramChatId: telegramChatId || null,
        telegramActivo: telegramActivo || false,
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        emailDestino: true,
        telefono: true,
        direccion: true,
        descripcion: true,
        telegramToken: true,
        telegramChatId: true,
        telegramActivo: true,
        qrUrl: true,
      },
    });

    return NextResponse.json({ success: true, negocio });
  } catch (error) {
    console.error('Error actualizando negocio:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
