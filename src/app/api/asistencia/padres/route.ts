import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// GET - Listar padres vinculados
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buscar = searchParams.get('buscar');

    let where: any = { activo: true };

    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { email: { contains: buscar, mode: 'insensitive' } },
        { telegramUsername: { contains: buscar, mode: 'insensitive' } }
      ];
    }

    const padres = await db.padreTelegram.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Obtener estudiantes asociados a cada padre
    const padresConEstudiantes = await Promise.all(
      padres.map(async (padre) => {
        const estudiantes = await db.estudiante.findMany({
          where: {
            OR: [
              { emailPadre: padre.email },
              { telefonoPadre: padre.telefono },
              { telegramChatIdPadre: padre.chatId }
            ]
          },
          select: {
            id: true,
            nombre: true,
            apellido: true,
            matricula: true,
            grupo: true
          }
        });

        return {
          ...padre,
          estudiantes
        };
      })
    );

    return NextResponse.json(padresConEstudiantes);
  } catch (error) {
    console.error('Error al obtener padres:', error);
    return NextResponse.json({ error: 'Error al obtener padres' }, { status: 500 });
  }
}

// POST - Generar código de vinculación para un padre
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validar que se proporcione email o teléfono del estudiante
    if (!data.estudianteId) {
      return NextResponse.json({ 
        error: 'Se requiere el ID del estudiante' 
      }, { status: 400 });
    }

    // Buscar estudiante
    const estudiante = await db.estudiante.findUnique({
      where: { id: data.estudianteId }
    });

    if (!estudiante) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
    }

    // Determinar si es para padre o madre
    const esPadre = data.tipo === 'padre';
    const email = esPadre ? estudiante.emailPadre : estudiante.emailMadre;
    const telefono = esPadre ? estudiante.telefonoPadre : estudiante.telefonoMadre;
    const nombre = esPadre ? estudiante.nombrePadre : estudiante.nombreMadre;

    if (!email && !telefono) {
      return NextResponse.json({ 
        error: `No hay ${esPadre ? 'datos del padre' : 'datos de la madre'} registrados` 
      }, { status: 400 });
    }

    // Generar código de vinculación
    const codigoVinculacion = randomUUID().substring(0, 8).toUpperCase();
    const codigoExpira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // Crear o actualizar registro del padre
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
          codigoExpira,
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
          codigoExpira
        }
      });
    }

    // Obtener configuración para el bot username
    const config = await db.configAsistencia.findUnique({
      where: { id: 'default' }
    });

    // Construir URL del bot
    const botUsername = config?.telegramBotUsername || 'TuBot';
    const botUrl = `https://t.me/${botUsername.replace('@', '')}?start=${codigoVinculacion}`;

    return NextResponse.json({
      success: true,
      codigo: codigoVinculacion,
      botUrl,
      botUsername,
      expira: codigoExpira.toISOString(),
      mensaje: `Hola ${nombre || 'padre/tutor'}, para recibir notificaciones de asistencia de ${estudiante.nombre} ${estudiante.apellido}, por favor haz clic en el siguiente enlace: ${botUrl}`,
      mensajeWhatsApp: `Hola ${nombre || 'padre/tutor'}, para recibir notificaciones de asistencia de ${estudiante.nombre} ${estudiante.apellido}, por favor haz clic en el siguiente enlace:\n\n${botUrl}\n\nO envía /start ${codigoVinculacion} al bot @${botUsername.replace('@', '')} en Telegram.`
    });
  } catch (error) {
    console.error('Error al generar código:', error);
    return NextResponse.json({ error: 'Error al generar código de vinculación' }, { status: 500 });
  }
}
