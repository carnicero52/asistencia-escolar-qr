import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener configuración
export async function GET() {
  try {
    let config = await db.configAsistencia.findUnique({
      where: { id: 'default' }
    });

    if (!config) {
      config = await db.configAsistencia.create({
        data: { id: 'default' }
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

// PUT - Actualizar configuración
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    const config = await db.configAsistencia.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        nombreInstitucion: data.nombreInstitucion || 'Instituto Educativo',
        logo: data.logo || null,
        horaInicioGeneral: data.horaInicioGeneral || '08:00',
        toleranciaMinutos: data.toleranciaMinutos || 5,
        diasClase: data.diasClase || '1,2,3,4,5',
        enviarNotificaciones: data.enviarNotificaciones ?? true,
        emailAdmin: data.emailAdmin || null,
        emailRemitente: data.emailRemitente || null,
        nombreRemitente: data.nombreRemitente || 'Sistema de Asistencia',
        telegramBotToken: data.telegramBotToken || null,
        telegramBotUsername: data.telegramBotUsername || null,
        telegramChatId: data.telegramChatId || null,
        enviarTelegram: data.enviarTelegram ?? false,
        enviarTelegramPadres: data.enviarTelegramPadres ?? true,
        telegramWebhookUrl: data.telegramWebhookUrl || null,
        notificarRetardo: data.notificarRetardo ?? true,
        notificarAusencia: data.notificarAusencia ?? true,
        notificarEntrada: data.notificarEntrada ?? false,
        colorPrimario: data.colorPrimario || '#10b981',
        mensajeBienvenida: data.mensajeBienvenida || '¡Bienvenido! Tu asistencia ha sido registrada.'
      },
      update: {
        nombreInstitucion: data.nombreInstitucion,
        logo: data.logo,
        horaInicioGeneral: data.horaInicioGeneral,
        toleranciaMinutos: data.toleranciaMinutos,
        diasClase: data.diasClase,
        enviarNotificaciones: data.enviarNotificaciones,
        emailAdmin: data.emailAdmin,
        emailRemitente: data.emailRemitente,
        nombreRemitente: data.nombreRemitente,
        telegramBotToken: data.telegramBotToken,
        telegramBotUsername: data.telegramBotUsername,
        telegramChatId: data.telegramChatId,
        enviarTelegram: data.enviarTelegram,
        enviarTelegramPadres: data.enviarTelegramPadres,
        telegramWebhookUrl: data.telegramWebhookUrl,
        notificarRetardo: data.notificarRetardo,
        notificarAusencia: data.notificarAusencia,
        notificarEntrada: data.notificarEntrada,
        colorPrimario: data.colorPrimario,
        mensajeBienvenida: data.mensajeBienvenida
      }
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
