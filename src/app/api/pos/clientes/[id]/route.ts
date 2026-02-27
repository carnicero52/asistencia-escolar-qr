import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const cliente = await db.clientePOS.findUnique({
      where: { id }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(cliente);
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// PUT - Actualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, email, telefono, direccion, rfc, notas } = body;

    // Verificar si el cliente existe
    const existente = await db.clientePOS.findUnique({
      where: { id }
    });

    if (!existente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Si cambia el email, verificar que no esté en uso
    if (email && email !== existente.email) {
      const emailEnUso = await db.clientePOS.findUnique({
        where: { email: email.toLowerCase() }
      });
      if (emailEnUso) {
        return NextResponse.json(
          { error: 'El email ya está en uso' },
          { status: 400 }
        );
      }
    }

    const cliente = await db.clientePOS.update({
      where: { id },
      data: {
        nombre: nombre || existente.nombre,
        email: email ? email.toLowerCase() : existente.email,
        telefono: telefono ?? existente.telefono,
        direccion: direccion ?? existente.direccion,
        rfc: rfc ?? existente.rfc,
        notas: notas ?? existente.notas,
      }
    });

    return NextResponse.json({
      success: true,
      cliente
    });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// DELETE - Eliminar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Soft delete
    await db.clientePOS.update({
      where: { id },
      data: { activo: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
