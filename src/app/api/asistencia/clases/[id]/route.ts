import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// GET - Obtener clase por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const clase = await db.clase.findUnique({
      where: { id },
      include: {
        _count: {
          select: { asistencias: true }
        }
      }
    });

    if (!clase) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      ...clase,
      diaNombre: DIAS_SEMANA[clase.diaSemana]
    });
  } catch (error) {
    console.error('Error al obtener clase:', error);
    return NextResponse.json({ error: 'Error al obtener clase' }, { status: 500 });
  }
}

// PUT - Actualizar clase
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const clase = await db.clase.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        profesor: data.profesor,
        salon: data.salon,
        diaSemana: data.diaSemana !== undefined ? parseInt(data.diaSemana) : undefined,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        toleranciaMinutos: data.toleranciaMinutos,
        activa: data.activa
      }
    });

    return NextResponse.json({
      ...clase,
      diaNombre: DIAS_SEMANA[clase.diaSemana]
    });
  } catch (error) {
    console.error('Error al actualizar clase:', error);
    return NextResponse.json({ error: 'Error al actualizar clase' }, { status: 500 });
  }
}

// DELETE - Eliminar clase
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar si hay asistencias asociadas
    const asistencias = await db.asistenciaEstudiante.count({
      where: { claseId: id }
    });

    if (asistencias > 0) {
      // Si hay asistencias, solo desactivar la clase
      await db.clase.update({
        where: { id },
        data: { activa: false }
      });
      return NextResponse.json({ 
        message: 'Clase desactivada (tiene registros de asistencia)',
        desactivada: true 
      });
    }

    // Si no hay asistencias, eliminar completamente
    await db.clase.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Clase eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar clase:', error);
    return NextResponse.json({ error: 'Error al eliminar clase' }, { status: 500 });
  }
}
