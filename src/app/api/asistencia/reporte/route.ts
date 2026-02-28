import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener reportes de asistencia
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const claseId = searchParams.get('claseId');
    const estudianteId = searchParams.get('estudianteId');
    const grupo = searchParams.get('grupo');
    const mes = searchParams.get('mes'); // YYYY-MM

    // Reporte por fecha específica
    if (fecha) {
      const asistencias = await db.asistenciaEstudiante.findMany({
        where: { fecha },
        include: {
          estudiante: true,
          clase: true
        },
        orderBy: { horaRegistro: 'asc' }
      });

      // Calcular estadísticas
      const stats = {
        total: asistencias.length,
        presentes: asistencias.filter(a => a.estado === 'PRESENTE').length,
        retardos: asistencias.filter(a => a.estado === 'RETARDO').length,
        ausentes: 0 // Se calculará comparando con lista de estudiantes
      };

      // Obtener estudiantes que no registraron asistencia
      const todosEstudiantes = await db.estudiante.findMany({
        where: { activo: true }
      });

      const idsPresentes = new Set(asistencias.map(a => a.estudianteId));
      const ausentes = todosEstudiantes.filter(e => !idsPresentes.has(e.id));
      stats.ausentes = ausentes.length;

      return NextResponse.json({
        fecha,
        estadisticas: stats,
        asistencias,
        ausentes: ausentes.map(e => ({
          estudiante: e,
          estado: 'AUSENTE'
        }))
      });
    }

    // Reporte por clase
    if (claseId) {
      const where: any = { claseId };
      if (mes) {
        where.fecha = { startsWith: mes };
      }

      const asistencias = await db.asistenciaEstudiante.findMany({
        where,
        include: { estudiante: true },
        orderBy: { fecha: 'desc' }
      });

      return NextResponse.json({
        claseId,
        total: asistencias.length,
        asistencias
      });
    }

    // Reporte por estudiante
    if (estudianteId) {
      const where: any = { estudianteId };
      if (mes) {
        where.fecha = { startsWith: mes };
      }

      const asistencias = await db.asistenciaEstudiante.findMany({
        where,
        include: { clase: true },
        orderBy: { fecha: 'desc' }
      });

      // Calcular estadísticas del estudiante
      const stats = {
        total: asistencias.length,
        presentes: asistencias.filter(a => a.estado === 'PRESENTE').length,
        retardos: asistencias.filter(a => a.estado === 'RETARDO').length,
        promedioRetraso: asistencias.length > 0 
          ? asistencias.reduce((sum, a) => sum + a.minutosRetraso, 0) / asistencias.length 
          : 0
      };

      return NextResponse.json({
        estudianteId,
        estadisticas: stats,
        asistencias
      });
    }

    // Reporte por grupo
    if (grupo) {
      const estudiantes = await db.estudiante.findMany({
        where: { grupo, activo: true },
        include: {
          asistencias: mes ? {
            where: { fecha: { startsWith: mes } }
          } : true
        }
      });

      const reporte = estudiantes.map(e => {
        const asistencias = e.asistencias;
        return {
          estudiante: {
            id: e.id,
            matricula: e.matricula,
            nombre: e.nombre,
            apellido: e.apellido
          },
          totalAsistencias: asistencias.length,
          presentes: asistencias.filter((a: any) => a.estado === 'PRESENTE').length,
          retardos: asistencias.filter((a: any) => a.estado === 'RETARDO').length,
          porcentajeAsistencia: asistencias.length > 0 
            ? (asistencias.length / (asistencias.length + 0)) * 100 // Simplificado
            : 0
        };
      });

      return NextResponse.json({
        grupo,
        totalEstudiantes: estudiantes.length,
        reporte
      });
    }

    // Resumen general
    const hoy = new Date().toISOString().split('T')[0];
    
    const [totalEstudiantes, totalClases, asistenciasHoy] = await Promise.all([
      db.estudiante.count({ where: { activo: true } }),
      db.clase.count({ where: { activa: true } }),
      db.asistenciaEstudiante.findMany({
        where: { fecha: hoy },
        include: { estudiante: true, clase: true }
      })
    ]);

    // Asistencias del mes
    const mesActual = hoy.substring(0, 7);
    const asistenciasMes = await db.asistenciaEstudiante.count({
      where: { fecha: { startsWith: mesActual } }
    });

    return NextResponse.json({
      fecha: hoy,
      resumen: {
        totalEstudiantes,
        totalClases,
        asistenciasHoy: asistenciasHoy.length,
        presentesHoy: asistenciasHoy.filter(a => a.estado === 'PRESENTE').length,
        retardosHoy: asistenciasHoy.filter(a => a.estado === 'RETARDO').length,
        asistenciasMes
      },
      ultimasAsistencias: asistenciasHoy.slice(0, 10)
    });
  } catch (error) {
    console.error('Error al generar reporte:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}
