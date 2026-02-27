// Servicio de notificaciones por Telegram

// Credenciales por defecto desde variables de entorno
const DEFAULT_TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface TelegramMessage {
  chatId: string;
  text: string;
}

// Verificar si hay configuración de Telegram disponible
export function hasTelegramConfig(): boolean {
  return !!(DEFAULT_TELEGRAM_TOKEN && DEFAULT_TELEGRAM_CHAT_ID);
}

// Obtener credenciales por defecto
export function getDefaultTelegramConfig() {
  return {
    token: DEFAULT_TELEGRAM_TOKEN || '',
    chatId: DEFAULT_TELEGRAM_CHAT_ID || '',
  };
}

// Enviar mensaje por Telegram
export async function sendTelegramMessage(
  token: string,
  message: TelegramMessage
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: message.chatId,
        text: message.text,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error('Error enviando mensaje de Telegram:', error);
    return false;
  }
}

// Notificar nuevo cliente al dueño
export async function telegramNotifyNewCliente(params: {
  token: string;
  chatId: string;
  negocioNombre: string;
  clienteNombre: string;
  clienteEmail: string;
}): Promise<boolean> {
  const { token, chatId, negocioNombre, clienteNombre, clienteEmail } = params;

  const text = `🎉 <b>Nuevo cliente en ${negocioNombre}</b>\n\n` +
    `👤 <b>Nombre:</b> ${clienteNombre}\n` +
    `📧 <b>Email:</b> ${clienteEmail}\n` +
    `📅 <b>Fecha:</b> ${new Date().toLocaleDateString('es-ES')}`;

  return sendTelegramMessage(token, { chatId, text });
}

// Notificar recompensa al dueño
export async function telegramNotifyReward(params: {
  token: string;
  chatId: string;
  negocioNombre: string;
  clienteNombre: string;
  clienteEmail: string;
  comprasTotal: number;
}): Promise<boolean> {
  const { token, chatId, negocioNombre, clienteNombre, clienteEmail, comprasTotal } = params;

  const text = `🎁 <b>¡Cliente con recompensa en ${negocioNombre}!</b>\n\n` +
    `👤 <b>Cliente:</b> ${clienteNombre}\n` +
    `📧 <b>Email:</b> ${clienteEmail}\n` +
    `🏆 <b>Compras acumuladas:</b> ${comprasTotal}\n\n` +
    `El cliente tiene derecho a un premio. ¡Entrégalo cuando lo solicite!`;

  return sendTelegramMessage(token, { chatId, text });
}

// Notificar nueva compra
export async function telegramNotifyCompra(params: {
  token: string;
  chatId: string;
  negocioNombre: string;
  clienteNombre: string;
  compraNumero: number;
}): Promise<boolean> {
  const { token, chatId, negocioNombre, clienteNombre, compraNumero } = params;

  const text = `🛒 <b>Nueva compra en ${negocioNombre}</b>\n\n` +
    `👤 <b>Cliente:</b> ${clienteNombre}\n` +
    `📦 <b>Compra #${compraNumero}</b>`;

  return sendTelegramMessage(token, { chatId, text });
}
