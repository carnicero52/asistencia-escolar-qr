import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Configurar bot de Telegram
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.botToken) {
      return NextResponse.json({ error: 'Token del bot requerido' }, { status: 400 });
    }

    // Verificar que el token es válido
    const botInfoRes = await fetch(`https://api.telegram.org/bot${data.botToken}/getMe`);
    const botInfo = await botInfoRes.json();

    if (!botInfo.ok) {
      return NextResponse.json({ 
        error: 'Token inválido. Verifica que el token sea correcto.' 
      }, { status: 400 });
    }

    // Construir URL del webhook
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;

    // Configurar webhook en Telegram
    const setWebhookRes = await fetch(
      `https://api.telegram.org/bot${data.botToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message']
        })
      }
    );

    const setWebhookResult = await setWebhookRes.json();

    if (!setWebhookResult.ok) {
      return NextResponse.json({ 
        error: 'Error al configurar webhook: ' + setWebhookResult.description
      }, { status: 400 });
    }

    // Guardar configuración
    await db.configAsistencia.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        telegramBotToken: data.botToken,
        telegramBotUsername: botInfo.result.username,
        telegramWebhookUrl: webhookUrl
      },
      update: {
        telegramBotToken: data.botToken,
        telegramBotUsername: botInfo.result.username,
        telegramWebhookUrl: webhookUrl
      }
    });

    return NextResponse.json({
      success: true,
      botUsername: botInfo.result.username,
      webhookUrl,
      message: 'Bot configurado correctamente'
    });
  } catch (error) {
    console.error('Error al configurar bot:', error);
    return NextResponse.json({ error: 'Error al configurar bot' }, { status: 500 });
  }
}
