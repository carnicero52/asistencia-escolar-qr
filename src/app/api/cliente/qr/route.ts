import { db } from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';

// GET - Buscar cliente por email para mostrar su QR
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
  }

  try {
    const cliente = await db.cliente.findFirst({
      where: {
        email: email.toLowerCase(),
        activo: true,
      },
      include: {
        negocio: {
          select: { nombre: true },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        telefono: cliente.telefono,
        comprasTotal: cliente.comprasTotal,
        recompensasPendientes: cliente.recompensasPendientes,
        recompensasCanjeadas: cliente.recompensasCanjeadas,
        qrCodigo: cliente.qrCodigo,
        negocio: cliente.negocio,
      },
    });
  } catch (error) {
    console.error('Error buscando cliente:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
