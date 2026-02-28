import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Configurar webhook del bot de Telegram
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.botToken) {
      return NextResponse.json({ error: 'Token del bot requerido' }, { status: 400 });
    }

    // Verificar que el token es válido obteniendo info del bot
    const botInfoRes = await fetch(`https://api.telegram.org/bot${data.botToken}/getMe`);
    const botInfo = await botInfoRes.json();

    if (!botInfo.ok) {
      return NextResponse.json({ 
        error: 'Token inválido. Verifica que el token sea correcto.' 
      }, { status: 400 });
    }

    // Construir URL del webhook
    // En desarrollo, usaremos la URL de producción
    let webhookUrl = data.webhookUrl;
    
    if (!webhookUrl) {
      // Intentar detectar la URL base
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      webhookUrl = `${protocol}://${host}/api/telegram/webhook`;
    }

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
        error: 'Error al configurar webhook',
        details: setWebhookResult.description 
      }, { status: 400 });
    }

    // Guardar configuración en la base de datos
    await db.configAsistencia.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        telegramBotToken: data.botToken,
        telegramBotUsername: `@${botInfo.result.username}`,
        telegramWebhookUrl: webhookUrl
      },
      update: {
        telegramBotToken: data.botToken,
        telegramBotUsername: `@${botInfo.result.username}`,
        telegramWebhookUrl: webhookUrl
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Bot configurado correctamente',
      botInfo: {
        username: `@${botInfo.result.username}`,
        firstName: botInfo.result.first_name,
        id: botInfo.result.id
      },
      webhookUrl,
      instructions: `Para vincular padres, deben:\n1. Abrir Telegram\n2. Buscar @${botInfo.result.username}\n3. Enviar /start\n4. Proporcionar su email o teléfono registrado`
    });
  } catch (error) {
    console.error('Error al configurar bot:', error);
    return NextResponse.json({ error: 'Error al configurar bot' }, { status: 500 });
  }
}

// GET - Verificar estado del bot
export async function GET() {
  try {
    const config = await db.configAsistencia.findUnique({
      where: { id: 'default' }
    });

    if (!config?.telegramBotToken) {
      return NextResponse.json({ 
        configured: false,
        message: 'Bot no configurado' 
      });
    }

    // Verificar estado del bot
    const botInfoRes = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/getMe`);
    const botInfo = await botInfoRes.json();

    // Verificar webhook
    const webhookInfoRes = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/getWebhookInfo`);
    const webhookInfo = await webhookInfoRes.json();

    return NextResponse.json({
      configured: true,
      botInfo: botInfo.ok ? {
        username: `@${botInfo.result.username}`,
        firstName: botInfo.result.first_name
      } : null,
      webhookInfo: webhookInfo.ok ? {
        url: webhookInfo.result.url,
        hasCustomCertificate: webhookInfo.result.has_custom_certificate,
        pendingUpdateCount: webhookInfo.result.pending_update_count,
        lastErrorDate: webhookInfo.result.last_error_date,
        lastErrorMessage: webhookInfo.result.last_error_message
      } : null
    });
  } catch (error) {
    console.error('Error al verificar bot:', error);
    return NextResponse.json({ error: 'Error al verificar bot' }, { status: 500 });
  }
}

// DELETE - Eliminar configuración del bot
export async function DELETE() {
  try {
    const config = await db.configAsistencia.findUnique({
      where: { id: 'default' }
    });

    if (config?.telegramBotToken) {
      // Eliminar webhook
      await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/deleteWebhook`);
    }

    await db.configAsistencia.update({
      where: { id: 'default' },
      data: {
        telegramBotToken: null,
        telegramBotUsername: null,
        telegramWebhookUrl: null
      }
    });

    return NextResponse.json({ success: true, message: 'Bot desconfigurado' });
  } catch (error) {
    console.error('Error al desconfigurar bot:', error);
    return NextResponse.json({ error: 'Error al desconfigurar bot' }, { status: 500 });
  }
}
