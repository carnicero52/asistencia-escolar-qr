import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enviarNotificacion } from '@/lib/notificaciones';

// Función para calcular el estado de asistencia
function calcularEstado(horaRegistro: string, horaInicio: string, toleranciaMinutos: number): { estado: string; minutosRetraso: number } {
  const [hReg, mReg, sReg = 0] = horaRegistro.split(':').map(Number);
  const [hIni, mIni] = horaInicio.split(':').map(Number);
  
  const minutosRegistro = hReg * 60 + mReg + sReg / 60;
  const minutosInicio = hIni * 60 + mIni;
  
  const diferencia = minutosRegistro - minutosInicio;
  
  if (diferencia <= toleranciaMinutos) {
    return { estado: 'PRESENTE', minutosRetraso: 0 };
  } else {
    return { estado: 'RETARDO', minutosRetraso: Math.round(diferencia) };
  }
}

// POST - Registro manual de asistencia (sin QR)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validar datos requeridos
    if (!data.estudianteId && !data.matricula) {
      return NextResponse.json({ 
        error: 'Se requiere ID del estudiante o matrícula' 
      }, { status: 400 });
    }

    if (!data.claseId) {
      return NextResponse.json({ 
        error: 'Se requiere ID de la clase' 
      }, { status: 400 });
    }

    // Buscar estudiante
    let estudiante;
    if (data.estudianteId) {
      estudiante = await db.estudiante.findUnique({
        where: { id: data.estudianteId }
      });
    } else {
      estudiante = await db.estudiante.findUnique({
        where: { matricula: data.matricula }
      });
    }

    if (!estudiante) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
    }

    if (!estudiante.activo) {
      return NextResponse.json({ error: 'Estudiante inactivo' }, { status: 400 });
    }

    // Obtener clase
    const clase = await db.clase.findUnique({
      where: { id: data.claseId }
    });

    if (!clase) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
    }

    // Obtener fecha y hora
    const fecha = data.fecha || new Date().toISOString().split('T')[0];
    const horaRegistro = data.hora || new Date().toTimeString().split(' ')[0];
    const tipo = data.tipo || 'ENTRADA'; // ENTRADA o SALIDA

    // Verificar si ya existe registro para hoy
    const existente = await db.asistenciaEstudiante.findUnique({
      where: {
        estudianteId_claseId_fecha: {
          estudianteId: estudiante.id,
          claseId: clase.id,
          fecha
        }
      }
    });

    if (existente) {
      // Actualizar registro existente (por ejemplo, marcar salida)
      const actualizado = await db.asistenciaEstudiante.update({
        where: { id: existente.id },
        data: {
          notas: data.notas || `Registro manual - ${tipo}`,
          // Podríamos agregar campo horaSalida si el modelo lo tuviera
        },
        include: {
          estudiante: true,
          clase: true
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Registro actualizado',
        asistencia: actualizado,
        existente: true
      });
    }

    // Calcular estado
    const { estado, minutosRetraso } = calcularEstado(
      horaRegistro,
      clase.horaInicio,
      clase.toleranciaMinutos
    );

    // Crear nuevo registro
    const asistencia = await db.asistenciaEstudiante.create({
      data: {
        estudianteId: estudiante.id,
        claseId: clase.id,
        fecha,
        horaRegistro,
        estado,
        minutosRetraso,
        notas: data.notas || `Registro manual - ${tipo}`
      },
      include: {
        estudiante: true,
        clase: true
      }
    });

    // Enviar notificación si hay retardo
    if (estado === 'RETARDO') {
      enviarNotificacion({
        estudianteId: estudiante.id,
        tipo: 'RETARDO',
        datos: {
          nombreEstudiante: `${estudiante.nombre} ${estudiante.apellido}`,
          clase: clase.nombre,
          hora: horaRegistro.substring(0, 5),
          minutosRetraso,
          fecha
        }
      }).catch(err => console.error('Error enviando notificación:', err));
    }

    return NextResponse.json({
      success: true,
      message: estado === 'PRESENTE' 
        ? `Asistencia manual registrada para ${estudiante.nombre}`
        : `Asistencia manual registrada con ${minutosRetraso} min de retraso`,
      asistencia,
      manual: true
    }, { status: 201 });
  } catch (error) {
    console.error('Error en registro manual:', error);
    return NextResponse.json({ error: 'Error al registrar asistencia manual' }, { status: 500 });
  }
}

// GET - Listar estudiantes para selección manual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get('busqueda');
    const claseId = searchParams.get('claseId');

    let where: any = { activo: true };

    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { apellido: { contains: busqueda, mode: 'insensitive' } },
        { matricula: { contains: busqueda, mode: 'insensitive' } }
      ];
    }

    const estudiantes = await db.estudiante.findMany({
      where,
      select: {
        id: true,
        matricula: true,
        nombre: true,
        apellido: true,
        grupo: true,
        email: true
      },
      orderBy: [{ nombre: 'asc' }],
      take: 20
    });

    // Si se especifica claseId, verificar asistencia de hoy
    let resultado = estudiantes;
    if (claseId) {
      const hoy = new Date().toISOString().split('T')[0];
      const asistenciasHoy = await db.asistenciaEstudiante.findMany({
        where: {
          claseId,
          fecha: hoy,
          estudianteId: { in: estudiantes.map(e => e.id) }
        },
        select: { estudianteId: true, estado: true, horaRegistro: true }
      });

      const asistenciasMap = new Map(asistenciasHoy.map(a => [a.estudianteId, a]));
      
      resultado = estudiantes.map(e => ({
        ...e,
        asistenciaHoy: asistenciasMap.get(e.id) || null
      }));
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error al buscar estudiantes:', error);
    return NextResponse.json({ error: 'Error al buscar estudiantes' }, { status: 500 });
  }
}
