import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db-libsql';
import { cookies } from 'next/headers';

// Actualizar candidato
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getDb();

    const sesionResult = await db.execute({
      sql: 'SELECT * FROM Sesion WHERE token = ?',
      args: [token]
    });

    if (sesionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    }

    const sesion = sesionResult.rows[0];
    const data = await request.json();

    // Verificar que el candidato pertenece a este negocio
    const candidatoResult = await db.execute({
      sql: 'SELECT id FROM Candidato WHERE id = ? AND negocioId = ?',
      args: [id, sesion.negocioId as string]
    });

    if (candidatoResult.rows.length === 0) {
      return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 });
    }

    await db.execute({
      sql: 'UPDATE Candidato SET estado = ?, notas = ?, updatedAt = ? WHERE id = ?',
      args: [data.estado, data.notas || null, new Date().toISOString(), id]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar candidato:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

// Eliminar candidato
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getDb();

    const sesionResult = await db.execute({
      sql: 'SELECT * FROM Sesion WHERE token = ?',
      args: [token]
    });

    if (sesionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    }

    const sesion = sesionResult.rows[0];

    // Verificar que el candidato pertenece a este negocio
    const candidatoResult = await db.execute({
      sql: 'SELECT id FROM Candidato WHERE id = ? AND negocioId = ?',
      args: [id, sesion.negocioId as string]
    });

    if (candidatoResult.rows.length === 0) {
      return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 });
    }

    await db.execute({
      sql: 'DELETE FROM Candidato WHERE id = ?',
      args: [id]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar candidato:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
