import { db } from '@/lib/database';
import { verifyAdminSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET - Obtener alertas de seguridad y estadísticas
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
    // Obtener alertas no revisadas
    const alertas = await db.alertaSeguridad.findMany({
      where: { negocioId },
      orderBy: { creadaEn: 'desc' },
      take: 50,
      include: {
        cliente: {
          select: { id: true, nombre: true, email: true },
        },
      },
    });

    // Obtener clientes bloqueados
    const clientesBloqueados = await db.cliente.findMany({
      where: { 
        negocioId,
        bloqueado: true 
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        motivoBloqueo: true,
        bloqueadoEn: true,
        comprasTotal: true,
      },
    });

    // Detectar actividad sospechosa: compras muy rápidas en las últimas 24 horas
    const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const comprasRapidas = await db.$queryRaw<any[]>`
      SELECT c.id, c.nombre, c.email, COUNT(co.id) as cantidad_compras
      FROM Cliente c
      JOIN Compra co ON c.id = co.clienteId
      WHERE c.negocioId = ${negocioId}
        AND co.fecha >= ${hace24Horas}
        AND c.bloqueado = 0
      GROUP BY c.id
      HAVING COUNT(co.id) > 5
      ORDER BY cantidad_compras DESC
      LIMIT 20
    `;

    // Estadísticas generales
    const totalAlertas = alertas.filter(a => !a.revisada).length;
    const totalBloqueados = clientesBloqueados.length;
    const totalSospechosos = comprasRapidas.length;

    return NextResponse.json({
      alertas,
      clientesBloqueados,
      actividadSospechosa: comprasRapidas,
      estadisticas: {
        totalAlertas,
        totalBloqueados,
        totalSospechosos,
      },
    });
  } catch (error) {
    console.error('Error obteniendo seguridad:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST - Bloquear/desbloquear cliente o crear alerta
export async function POST(request: NextRequest) {
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
    const { accion, clienteId, motivo, compraId } = body;

    if (accion === 'bloquear' && clienteId) {
      // Bloquear cliente
      const cliente = await db.cliente.update({
        where: { id: clienteId },
        data: {
          bloqueado: true,
          motivoBloqueo: motivo || 'Bloqueado por el administrador',
          bloqueadoEn: new Date(),
        },
      });

      // Crear alerta
      await db.alertaSeguridad.create({
        data: {
          negocioId,
          clienteId,
          tipo: 'manual',
          descripcion: `Cliente bloqueado: ${motivo || 'Sin motivo especificado'}`,
        },
      });

      return NextResponse.json({ success: true, cliente });
    }

    if (accion === 'desbloquear' && clienteId) {
      // Desbloquear cliente
      const cliente = await db.cliente.update({
        where: { id: clienteId },
        data: {
          bloqueado: false,
          motivoBloqueo: null,
          bloqueadoEn: null,
        },
      });

      return NextResponse.json({ success: true, cliente });
    }

    if (accion === 'marcar_sospechosa' && compraId) {
      // Marcar compra como sospechosa
      const compra = await db.compra.update({
        where: { id: compraId },
        data: { sospechosa: true },
      });

      return NextResponse.json({ success: true, compra });
    }

    if (accion === 'revisar_alerta') {
      const { alertaId } = body;
      // Marcar alerta como revisada
      const alerta = await db.alertaSeguridad.update({
        where: { id: alertaId },
        data: {
          revisada: true,
          revisadaEn: new Date(),
        },
      });

      return NextResponse.json({ success: true, alerta });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error en acción de seguridad:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
