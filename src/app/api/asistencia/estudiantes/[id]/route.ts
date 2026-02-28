import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// GET - Obtener estudiante por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const estudiante = await db.estudiante.findUnique({
      where: { id },
      include: {
        asistencias: {
          take: 10,
          orderBy: { fecha: 'desc' },
          include: { clase: true }
        },
        _count: {
          select: { asistencias: true }
        }
      }
    });

    if (!estudiante) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
    }

    return NextResponse.json(estudiante);
  } catch (error) {
    console.error('Error al obtener estudiante:', error);
    return NextResponse.json({ error: 'Error al obtener estudiante' }, { status: 500 });
  }
}

// PUT - Actualizar estudiante
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const estudiante = await db.estudiante.update({
      where: { id },
      data: {
        matricula: data.matricula,
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        telefono: data.telefono,
        grupo: data.grupo,
        activo: data.activo,
        // Datos del padre
        nombrePadre: data.nombrePadre,
        emailPadre: data.emailPadre,
        telefonoPadre: data.telefonoPadre,
        telegramPadre: data.telegramPadre,
        telegramChatIdPadre: data.telegramChatIdPadre,
        padreVinculado: data.padreVinculado,
        // Datos de la madre
        nombreMadre: data.nombreMadre,
        emailMadre: data.emailMadre,
        telefonoMadre: data.telefonoMadre,
        telegramMadre: data.telegramMadre,
        telegramChatIdMadre: data.telegramChatIdMadre,
        madreVinculada: data.madreVinculada
      }
    });

    return NextResponse.json(estudiante);
  } catch (error) {
    console.error('Error al actualizar estudiante:', error);
    return NextResponse.json({ error: 'Error al actualizar estudiante' }, { status: 500 });
  }
}

// DELETE - Eliminar estudiante
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar si hay asistencias asociadas
    const asistencias = await db.asistenciaEstudiante.count({
      where: { estudianteId: id }
    });

    if (asistencias > 0) {
      // Si hay asistencias, solo desactivar el estudiante
      await db.estudiante.update({
        where: { id },
        data: { activo: false }
      });
      return NextResponse.json({ 
        message: 'Estudiante desactivado (tiene registros de asistencia)',
        desactivado: true 
      });
    }

    // Si no hay asistencias, eliminar completamente
    await db.estudiante.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Estudiante eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar estudiante:', error);
    return NextResponse.json({ error: 'Error al eliminar estudiante' }, { status: 500 });
  }
}
