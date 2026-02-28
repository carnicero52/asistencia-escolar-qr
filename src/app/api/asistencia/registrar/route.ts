import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enviarNotificacion } from '@/lib/notificaciones';

// Función para calcular el estado de asistencia
function calcularEstado(horaRegistro: string, horaInicio: string, toleranciaMinutos: number): { estado: string; minutosRetraso: number } {
  const [hReg, mReg, sReg] = horaRegistro.split(':').map(Number);
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

// POST - Registrar asistencia por QR
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validar token QR
    if (!data.qrToken) {
      return NextResponse.json({ error: 'Token QR requerido' }, { status: 400 });
    }

    // Buscar estudiante por token QR
    const estudiante = await db.estudiante.findUnique({
      where: { qrToken: data.qrToken }
    });

    if (!estudiante) {
      return NextResponse.json({ error: 'QR no válido' }, { status: 404 });
    }

    if (!estudiante.activo) {
      return NextResponse.json({ error: 'Estudiante inactivo' }, { status: 400 });
    }

    // Obtener fecha y hora actual
    const now = new Date();
    const fecha = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaRegistro = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const diaSemana = now.getDay() || 7; // 1=Lunes, 7=Domingo

    // Buscar clase para hoy
    let claseId = data.claseId;
    
    if (!claseId) {
      // Buscar clase del día actual que esté en horario
      const clasesHoy = await db.clase.findMany({
        where: {
          diaSemana: diaSemana === 0 ? 7 : diaSemana,
          activa: true
        }
      });

      // Buscar la clase más cercana a la hora actual
      const [horaActual] = horaRegistro.split(':');
      const minutosActuales = parseInt(horaActual) * 60 + parseInt(horaRegistro.split(':')[1]);
      
      for (const clase of clasesHoy) {
        const [hIni, mIni] = clase.horaInicio.split(':').map(Number);
        const [hFin, mFin] = clase.horaFin.split(':').map(Number);
        const minutosInicio = hIni * 60 + mIni;
        const minutosFin = hFin * 60 + mFin;
        
        // Si está dentro del rango de la clase (+ tolerancia)
        if (minutosActuales >= minutosInicio - 30 && minutosActuales <= minutosFin) {
          claseId = clase.id;
          break;
        }
      }
    }

    if (!claseId) {
      return NextResponse.json({ 
        error: 'No hay clases activas en este momento',
        estudiante: { nombre: estudiante.nombre, apellido: estudiante.apellido }
      }, { status: 400 });
    }

    // Obtener info de la clase
    const clase = await db.clase.findUnique({
      where: { id: claseId }
    });

    if (!clase) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
    }

    // Verificar si ya registró asistencia hoy
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
      return NextResponse.json({ 
        error: 'Ya registraste asistencia para esta clase hoy',
        estudiante: { nombre: estudiante.nombre, apellido: estudiante.apellido },
        asistencia: existente
      }, { status: 400 });
    }

    // Calcular estado
    const { estado, minutosRetraso } = calcularEstado(
      horaRegistro,
      clase.horaInicio,
      clase.toleranciaMinutos
    );

    // Crear registro de asistencia
    const asistencia = await db.asistenciaEstudiante.create({
      data: {
        estudianteId: estudiante.id,
        claseId: clase.id,
        fecha,
        horaRegistro,
        estado,
        minutosRetraso,
        dispositivo: data.dispositivo || null,
        ipRegistro: data.ip || null,
        notas: data.notas || null
      },
      include: {
        estudiante: true,
        clase: true
      }
    });

    // Enviar notificación si hay retardo
    if (estado === 'RETARDO') {
      // Enviar notificación en segundo plano (no bloquea la respuesta)
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
        ? `¡Bienvenido ${estudiante.nombre}! Asistencia registrada a tiempo.`
        : `Asistencia registrada con ${minutosRetraso} minutos de retraso.`,
      asistencia,
      notificacionEnviada: estado === 'RETARDO'
    }, { status: 201 });
  } catch (error) {
    console.error('Error al registrar asistencia:', error);
    return NextResponse.json({ error: 'Error al registrar asistencia' }, { status: 500 });
  }
}

// GET - Verificar estado de asistencia por token QR
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qrToken = searchParams.get('qrToken');

    if (!qrToken) {
      return NextResponse.json({ error: 'Token QR requerido' }, { status: 400 });
    }

    const estudiante = await db.estudiante.findUnique({
      where: { qrToken },
      include: {
        asistencias: {
          take: 5,
          orderBy: { fecha: 'desc' },
          include: { clase: true }
        }
      }
    });

    if (!estudiante) {
      return NextResponse.json({ error: 'QR no válido' }, { status: 404 });
    }

    return NextResponse.json({
      estudiante: {
        id: estudiante.id,
        matricula: estudiante.matricula,
        nombre: estudiante.nombre,
        apellido: estudiante.apellido,
        email: estudiante.email,
        grupo: estudiante.grupo
      },
      ultimasAsistencias: estudiante.asistencias
    });
  } catch (error) {
    console.error('Error al verificar estudiante:', error);
    return NextResponse.json({ error: 'Error al verificar estudiante' }, { status: 500 });
  }
}
