import { db } from '@/lib/database';
import { verifyAdminSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// POST - Canjear recompensa de un cliente
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
    const { clienteId } = body;

    if (!clienteId) {
      return NextResponse.json({ error: 'ID de cliente requerido' }, { status: 400 });
    }

    // Verificar que el cliente pertenece al negocio
    const cliente = await db.cliente.findFirst({
      where: { id: clienteId, negocioId },
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    if (cliente.recompensasPendientes <= 0) {
      return NextResponse.json({ error: 'El cliente no tiene recompensas pendientes' }, { status: 400 });
    }

    // Actualizar cliente
    const clienteActualizado = await db.cliente.update({
      where: { id: clienteId },
      data: {
        recompensasPendientes: cliente.recompensasPendientes - 1,
        recompensasCanjeadas: cliente.recompensasCanjeadas + 1,
      },
    });

    return NextResponse.json({
      success: true,
      cliente: clienteActualizado,
    });
  } catch (error) {
    console.error('Error canjeando recompensa:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
