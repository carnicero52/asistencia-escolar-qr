import { db } from '@/lib/database';
import { verifyAdminSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET - Obtener detalles de un cliente específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('admin_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const negocioId = await verifyAdminSession(token);

  if (!negocioId) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    const cliente = await db.cliente.findFirst({
      where: { 
        id,
        negocioId, // Asegurar que el cliente pertenece al negocio del admin
      },
      include: {
        compras: {
          orderBy: { fecha: 'desc' },
          take: 50,
          select: {
            id: true,
            fecha: true,
            compraNumero: true,
            esRecompensa: true,
          },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Calcular estadísticas adicionales
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const comprasUltimos30Dias = cliente.compras.filter(
      c => new Date(c.fecha) >= thirtyDaysAgo
    ).length;

    const comprasUltimos7Dias = cliente.compras.filter(
      c => new Date(c.fecha) >= sevenDaysAgo
    ).length;

    // Calcular promedio de compras por mes
    const primeraCompra = cliente.compras[cliente.compras.length - 1];
    let comprasPorMes = 0;
    if (primeraCompra) {
      const mesesDesdePrimeraCompra = Math.max(1, 
        (now.getTime() - new Date(primeraCompra.fecha).getTime()) / (30 * 24 * 60 * 60 * 1000)
      );
      comprasPorMes = cliente.comprasTotal / mesesDesdePrimeraCompra;
    }

    return NextResponse.json({
      cliente: {
        ...cliente,
        estadisticas: {
          comprasUltimos7Dias,
          comprasUltimos30Dias,
          comprasPorMes: Math.round(comprasPorMes * 10) / 10,
        },
      },
    });
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
