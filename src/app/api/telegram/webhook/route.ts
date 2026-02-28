import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Webhook de Telegram para recibir mensajes del bot
 * Este endpoint recibe los mensajes cuando los padres interactúan con el bot
 * 
 * Flujo:
 * 1. Padre abre el enlace de vinculación (https://t.me/bot?start=CODIGO)
 * 2. Telegram envía el mensaje al webhook
 * 3. Verificamos el código y vinculamos al padre
 * 4. A partir de ahí, el padre recibe notificaciones
 */

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
      title?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    date: number;
    text?: string;
    entities?: any[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    
    console.log('[Telegram Webhook] Update recibido:', JSON.stringify(update, null, 2));

    // Ignorar si no hay mensaje
    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const { message } = update;
    const chatId = message.chat.id.toString();
    const fromId = message.from.id;
    const fromUsername = message.from.username;
    const fromName = `${message.from.first_name}${message.from.last_name ? ' ' + message.from.last_name : ''}`;
    const text = message.text.trim();

    console.log(`[Telegram Webhook] Mensaje de ${fromName} (@${fromUsername}): ${text}`);

    // Obtener configuración del bot
    const config = await db.configAsistencia.findUnique({
      where: { id: 'default' }
    });

    if (!config?.telegramBotToken) {
      console.error('[Telegram Webhook] Bot no configurado');
      return NextResponse.json({ ok: true });
    }

    const botToken = config.telegramBotToken;

    // Función para enviar mensaje
    const sendMessage = async (text: string, parseMode: string = 'HTML') => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode
        })
      });
    };

    // ─────────────────────────────────────────────────────────────
    // COMANDO /start - Inicio del bot o vinculación con código
    // ─────────────────────────────────────────────────────────────

    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const codigo = parts[1]?.toUpperCase();

      if (codigo) {
        // El padre está intentando vincularse con un código
        console.log(`[Telegram Webhook] Intento de vinculación con código: ${codigo}`);
        
        const padre = await db.padreTelegram.findFirst({
          where: {
            codigoVinculacion: codigo,
            codigoUsado: false,
            codigoExpira: { gte: new Date() }
          }
        });

        if (!padre) {
          await sendMessage(
            `❌ <b>Código inválido o expirado</b>\n\n` +
            `El código que ingresaste no es válido o ya ha expirado.\n` +
            `Por favor, solicita un nuevo código en la institución educativa.`,
            'HTML'
          );
          return NextResponse.json({ ok: true });
        }

        // Vincular al padre
        await db.padreTelegram.update({
          where: { id: padre.id },
          data: {
            chatId,
            telegramUsername: fromUsername ? `@${fromUsername}` : null,
            codigoUsado: true,
            verificado: true
          }
        });

        // Buscar estudiantes asociados a este padre (por email o teléfono)
        const estudiantes = await db.estudiante.findMany({
          where: {
            OR: [
              // Si es padre
              { emailPadre: padre.email, activo: true },
              { telefonoPadre: padre.telefono, activo: true },
              // Si es madre
              { emailMadre: padre.email, activo: true },
              { telefonoMadre: padre.telefono, activo: true }
            ]
          }
        });

        // Actualizar cada estudiante con el chatId del padre
        for (const est of estudiantes) {
          // Determinar si es padre o madre para este estudiante
          const esPadre = (est.emailPadre === padre.email || est.telefonoPadre === padre.telefono);
          const esMadre = (est.emailMadre === padre.email || est.telefonoMadre === padre.telefono);

          if (esPadre) {
            await db.estudiante.update({
              where: { id: est.id },
              data: {
                telegramChatIdPadre: chatId,
                padreVinculado: true
              }
            });
          }
          if (esMadre) {
            await db.estudiante.update({
              where: { id: est.id },
              data: {
                telegramChatIdMadre: chatId,
                madreVinculada: true
              }
            });
          }
        }

        const estudiantesNombres = estudiantes
          .map(e => `• ${e.nombre} ${e.apellido} (${e.grupo || 'Sin grupo'})`)
          .join('\n');

        await sendMessage(
          `✅ <b>¡Vinculación exitosa!</b>\n\n` +
          `Hola ${fromName}, has sido vinculado correctamente.\n\n` +
          `📱 <b>Estudiantes asociados:</b>\n${estudiantesNombres}\n\n` +
          `📢 A partir de ahora recibirás notificaciones de:\n` +
          `• Entradas y salidas\n` +
          `• Retardos\n` +
          `• Ausencias\n\n` +
          `${config.nombreInstitucion ? `🏫 ${config.nombreInstitucion}` : ''}`,
          'HTML'
        );

        console.log(`[Telegram Webhook] Padre ${fromName} vinculado exitosamente a ${estudiantes.length} estudiantes`);
        return NextResponse.json({ ok: true });
      }

      // /start sin código - mensaje de bienvenida
      await sendMessage(
        `👋 <b>¡Bienvenido al Sistema de Notificaciones!</b>\n\n` +
        `${config.nombreInstitucion ? `🏫 <b>${config.nombreInstitucion}</b>\n\n` : ''}` +
        `Para recibir notificaciones de asistencia de tu hijo/a:\n\n` +
        `1️⃣ Solicita un código de vinculación en la institución\n` +
        `2️⃣ Envía el comando: <code>/start TU_CODIGO</code>\n\n` +
        `📌 Ejemplo: <code>/start ABC12345</code>\n\n` +
        `Una vez vinculado, recibirás alertas de:\n` +
        `• ✅ Entradas y salidas\n` +
        `• ⏰ Retardos\n` +
        `• ❌ Ausencias`,
        'HTML'
      );
      return NextResponse.json({ ok: true });
    }

    // ─────────────────────────────────────────────────────────────
    // COMANDO /ayuda - Ayuda del bot
    // ─────────────────────────────────────────────────────────────

    if (text === '/ayuda' || text === '/help') {
      await sendMessage(
        `📚 <b>Ayuda del Sistema de Notificaciones</b>\n\n` +
        `<b>Comandos disponibles:</b>\n\n` +
        `🔹 /start - Iniciar el bot\n` +
        `🔹 /start CODIGO - Vincular tu cuenta\n` +
        `🔹 /mis_hijos - Ver estudiantes asociados\n` +
        `🔹 /estado - Estado de vinculación\n` +
        `🔹 /ayuda - Mostrar esta ayuda\n\n` +
        `${config.nombreInstitucion ? `🏫 ${config.nombreInstitucion}` : ''}`,
        'HTML'
      );
      return NextResponse.json({ ok: true });
    }

    // ─────────────────────────────────────────────────────────────
    // COMANDO /mis_hijos - Ver estudiantes asociados
    // ─────────────────────────────────────────────────────────────

    if (text === '/mis_hijos' || text === '/hijos') {
      const padre = await db.padreTelegram.findFirst({
        where: { chatId }
      });

      if (!padre) {
        await sendMessage(
          `⚠️ <b>No estás vinculado</b>\n\n` +
          `Para ver tus estudiantes asociados, primero debes vincular tu cuenta.\n` +
          `Usa /start CODIGO para vincular.`,
          'HTML'
        );
        return NextResponse.json({ ok: true });
      }

      const estudiantes = await db.estudiante.findMany({
        where: {
          OR: [
            { telegramChatIdPadre: chatId },
            { telegramChatIdMadre: chatId }
          ],
          activo: true
        }
      });

      if (estudiantes.length === 0) {
        await sendMessage(
          `📋 <b>Sin estudiantes asociados</b>\n\n` +
          `No hay estudiantes vinculados a tu cuenta.\n` +
          `Contacta a la institución educativa.`,
          'HTML'
        );
        return NextResponse.json({ ok: true });
      }

      const lista = estudiantes.map((e, i) => 
        `${i + 1}. <b>${e.nombre} ${e.apellido}</b>\n` +
        `   📚 Matrícula: ${e.matricula}\n` +
        `   📖 Grupo: ${e.grupo || 'Sin grupo'}`
      ).join('\n\n');

      await sendMessage(
        `👨‍👩‍👧‍👦 <b>Tus Estudiantes Asociados</b>\n\n${lista}`,
        'HTML'
      );
      return NextResponse.json({ ok: true });
    }

    // ─────────────────────────────────────────────────────────────
    // COMANDO /estado - Estado de vinculación
    // ─────────────────────────────────────────────────────────────

    if (text === '/estado') {
      const padre = await db.padreTelegram.findFirst({
        where: { chatId }
      });

      if (!padre) {
        await sendMessage(
          `❌ <b>No vinculado</b>\n\n` +
          `Tu cuenta de Telegram no está vinculada.\n` +
          `Usa /start CODIGO para vincular.`,
          'HTML'
        );
        return NextResponse.json({ ok: true });
      }

      const estudiantes = await db.estudiante.findMany({
        where: {
          OR: [
            { telegramChatIdPadre: chatId },
            { telegramChatIdMadre: chatId }
          ]
        }
      });

      await sendMessage(
        `✅ <b>Cuenta Vinculada</b>\n\n` +
        `📱 Telegram: @${padre.telegramUsername || 'No definido'}\n` +
        `📧 Email: ${padre.email || 'No definido'}\n` +
        `📞 Teléfono: ${padre.telefono || 'No definido'}\n` +
        `👨‍👩‍👧‍👦 Estudiantes: ${estudiantes.length}\n` +
        `📅 Vinculado: ${padre.createdAt.toLocaleDateString('es-ES')}\n\n` +
        `✅ Estado: Activo y recibiendo notificaciones`,
        'HTML'
      );
      return NextResponse.json({ ok: true });
    }

    // ─────────────────────────────────────────────────────────────
    // MENSAJE POR DEFECTO
    // ─────────────────────────────────────────────────────────────

    await sendMessage(
      `🤖 <b>Sistema de Notificaciones Escolares</b>\n\n` +
      `No entendí tu mensaje. Usa /ayuda para ver los comandos disponibles.`,
      'HTML'
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error);
    return NextResponse.json({ ok: true }); // Siempre devolver ok a Telegram
  }
}

// GET para verificar que el webhook está activo
export async function GET(request: NextRequest) {
  const config = await db.configAsistencia.findUnique({
    where: { id: 'default' },
    select: {
      telegramBotUsername: true,
      telegramWebhookUrl: true,
      enviarTelegram: true,
      enviarTelegramPadres: true
    }
  });

  return NextResponse.json({
    status: 'Webhook activo',
    botUsername: config?.telegramBotUsername,
    webhookConfigured: !!config?.telegramWebhookUrl,
    enviarTelegram: config?.enviarTelegram,
    enviarTelegramPadres: config?.enviarTelegramPadres
  });
}
