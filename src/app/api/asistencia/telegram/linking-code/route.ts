import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// POST - Generar código de vinculación para padre/madre
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.estudianteId || !data.tipo) {
      return NextResponse.json({ 
        error: 'Se requiere estudianteId y tipo (PADRE/MADRE)' 
      }, { status: 400 });
    }

    // Buscar estudiante
    const estudiante = await db.estudiante.findUnique({
      where: { id: data.estudianteId }
    });

    if (!estudiante) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
    }

    // Determinar datos según tipo
    const esPadre = data.tipo === 'PADRE';
    const email = esPadre ? estudiante.emailPadre : estudiante.emailMadre;
    const telefono = esPadre ? estudiante.telefonoPadre : estudiante.telefonoMadre;
    const nombre = esPadre ? estudiante.nombrePadre : estudiante.nombreMadre;

    if (!email && !telefono) {
      return NextResponse.json({ 
        error: `No hay ${esPadre ? 'datos del padre' : 'datos de la madre'} registrados` 
      }, { status: 400 });
    }

    // Generar código
    const codigoVinculacion = randomUUID().substring(0, 8).toUpperCase();

    // Obtener configuración
    const config = await db.configAsistencia.findUnique({
      where: { id: 'default' }
    });

    // Crear/actualizar registro del padre
    let padre = await db.padreTelegram.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { telefono: telefono || undefined }
        ]
      }
    });

    if (padre) {
      padre = await db.padreTelegram.update({
        where: { id: padre.id },
        data: {
          nombre,
          codigoVinculacion,
          codigoExpira: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
          codigoUsado: false
        }
      });
    } else {
      padre = await db.padreTelegram.create({
        data: {
          nombre,
          email,
          telefono,
          codigoVinculacion,
          codigoExpira: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    }

    // Construir URL del bot
    const botUsername = config?.telegramBotUsername || '';
    const botUrl = botUsername 
      ? `https://t.me/${botUsername.replace('@', '')}?start=${codigoVinculacion}`
      : '';

    return NextResponse.json({
      success: true,
      codigo: codigoVinculacion,
      botUrl,
      botUsername,
      nombre,
      email,
      telefono,
      expira: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      mensaje: `Hola ${nombre || 'padre/tutor'}, para recibir notificaciones de ${estudiante.nombre} ${estudiante.apellido}, abre este enlace: ${botUrl}`
    });
  } catch (error) {
    console.error('Error al generar código:', error);
    return NextResponse.json({ error: 'Error al generar código de vinculación' }, { status: 500 });
  }
}
