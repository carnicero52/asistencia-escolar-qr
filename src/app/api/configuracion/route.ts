import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener configuración
export async function GET() {
  try {
    let config = await db.configuracion.findUnique({
      where: { id: 'default' }
    });

    if (!config) {
      config = await db.configuracion.create({
        data: {
          id: 'default',
          nombreNegocio: 'Mi Negocio',
          emailPropietario: 'marcocarnicero1@gmail.com',
          telegramBotToken: '8518192400:AAFqTyWwzwHVN6kiFOn_9Kughixi_fCc0Q0',
          telegramChatId: '5743796914',
          stockMinimoGlobal: 5,
          porcentajeGanancia: 30,
          moneda: '$',
          notificacionesEmail: true,
          notificacionesTelegram: true
        }
      });
    }

    // Ocultar token de Telegram en la respuesta
    const configSafe = {
      ...config,
      telegramBotToken: config.telegramBotToken ? '••••••••••' : ''
    };

    return NextResponse.json(configSafe);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

// PUT - Actualizar configuración
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    // Obtener config actual para mantener el token si no se cambia
    const configActual = await db.configuracion.findUnique({
      where: { id: 'default' }
    });

    const updateData: any = {
      nombreNegocio: data.nombreNegocio,
      emailPropietario: data.emailPropietario,
      stockMinimoGlobal: parseInt(data.stockMinimoGlobal) || 5,
      porcentajeGanancia: parseInt(data.porcentajeGanancia) || 30,
      moneda: data.moneda || '$',
      notificacionesEmail: data.notificacionesEmail === true,
      notificacionesTelegram: data.notificacionesTelegram === true
    };

    // Solo actualizar tokens si se proporcionan nuevos
    if (data.telegramBotToken && !data.telegramBotToken.includes('•')) {
      updateData.telegramBotToken = data.telegramBotToken;
    }
    if (data.telegramChatId) {
      updateData.telegramChatId = data.telegramChatId;
    }

    const config = await db.configuracion.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        nombreNegocio: data.nombreNegocio || 'Mi Negocio',
        emailPropietario: data.emailPropietario || '',
        telegramBotToken: data.telegramBotToken || '',
        telegramChatId: data.telegramChatId || '',
        stockMinimoGlobal: parseInt(data.stockMinimoGlobal) || 5,
        porcentajeGanancia: parseInt(data.porcentajeGanancia) || 30,
        moneda: data.moneda || '$',
        notificacionesEmail: data.notificacionesEmail === true,
        notificacionesTelegram: data.notificacionesTelegram === true
      }
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
