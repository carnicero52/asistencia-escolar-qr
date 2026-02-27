// Sistema de Notificaciones para ContrataFácil

interface NotificacionData {
  nombreNegocio: string;
  nombreCandidato: string;
  emailCandidato: string;
  telefonoCandidato: string;
  puestoSolicitado?: string;
  experiencia?: string;
}

// ===== TELEGRAM =====
export async function enviarNotificacionTelegram(
  botToken: string,
  chatId: string,
  data: NotificacionData
): Promise<{ success: boolean; error?: string }> {
  try {
    const mensaje = `
🔔 *NUEVO CANDIDATO* 🔔

🏢 *Negocio:* ${data.nombreNegocio}

👤 *Nombre:* ${data.nombreCandidato}
📧 *Email:* ${data.emailCandidato}
📱 *Teléfono:* ${data.telefonoCandidato}
${data.puestoSolicitado ? `💼 *Puesto:* ${data.puestoSolicitado}` : ''}
${data.experiencia ? `⏱️ *Experiencia:* ${data.experiencia}` : ''}

📅 *Fecha:* ${new Date().toLocaleDateString('es-MX')}
    `.trim();

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: mensaje,
          parse_mode: 'Markdown'
        })
      }
    );

    const result = await response.json();
    
    if (!result.ok) {
      return { success: false, error: result.description || 'Error al enviar' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ===== EMAIL (Gmail/SMTP) =====
export async function enviarNotificacionEmail(
  config: {
    smtp: string;
    puerto: number;
    usuario: string;
    password: string;
    remitente: string;
  },
  emailDestino: string,
  data: NotificacionData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Usamos la API interna para enviar el email
    const response = await fetch('/api/notificaciones/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config,
        emailDestino,
        data
      })
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ===== WHATSAPP (API externa) =====
export async function enviarNotificacionWhatsapp(
  apiUrl: string,
  apiKey: string,
  numero: string,
  data: NotificacionData
): Promise<{ success: boolean; error?: string }> {
  try {
    const mensaje = `🔔 *NUEVO CANDIDATO*\n\n` +
      `🏢 Negocio: ${data.nombreNegocio}\n\n` +
      `👤 Nombre: ${data.nombreCandidato}\n` +
      `📧 Email: ${data.emailCandidato}\n` +
      `📱 Teléfono: ${data.telefonoCandidato}\n` +
      `${data.puestoSolicitado ? `💼 Puesto: ${data.puestoSolicitado}\n` : ''}` +
      `${data.experiencia ? `⏱️ Experiencia: ${data.experiencia}\n` : ''}` +
      `\n📅 ${new Date().toLocaleDateString('es-MX')}`;

    // La API externa puede ser cualquier proveedor
    // Formato flexible para diferentes APIs
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        to: numero,
        message: mensaje,
        type: 'text'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ===== FUNCIÓN PRINCIPAL =====
export async function enviarNotificaciones(
  negocio: {
    nombre: string;
    email: string;
    
    // Telegram
    notifTelegramActivo: boolean;
    notifTelegramBotToken?: string | null;
    notifTelegramChatId?: string | null;
    
    // Email
    notifEmailActivo: boolean;
    notifEmailSmtp?: string | null;
    notifEmailPuerto?: number | null;
    notifEmailUsuario?: string | null;
    notifEmailPassword?: string | null;
    notifEmailRemitente?: string | null;
    
    // WhatsApp
    notifWhatsappActivo: boolean;
    notifWhatsappApiUrl?: string | null;
    notifWhatsappApiKey?: string | null;
    notifWhatsappNumero?: string | null;
  },
  candidato: {
    nombre: string;
    email: string;
    telefono: string;
    puestoSolicitado?: string | null;
    experiencia?: string | null;
  }
): Promise<void> {
  const data: NotificacionData = {
    nombreNegocio: negocio.nombre,
    nombreCandidato: candidato.nombre,
    emailCandidato: candidato.email,
    telefonoCandidato: candidato.telefono,
    puestoSolicitado: candidato.puestoSolicitado || undefined,
    experiencia: candidato.experiencia || undefined
  };

  const promesas: Promise<void>[] = [];

  // Telegram
  if (negocio.notifTelegramActivo && negocio.notifTelegramBotToken && negocio.notifTelegramChatId) {
    promesas.push(
      enviarNotificacionTelegram(
        negocio.notifTelegramBotToken,
        negocio.notifTelegramChatId,
        data
      ).then(result => {
        if (!result.success) {
          console.error('Error Telegram:', result.error);
        }
      })
    );
  }

  // Email
  if (negocio.notifEmailActivo && negocio.notifEmailSmtp && negocio.notifEmailUsuario && negocio.notifEmailPassword) {
    promesas.push(
      enviarNotificacionEmail(
        {
          smtp: negocio.notifEmailSmtp,
          puerto: negocio.notifEmailPuerto || 587,
          usuario: negocio.notifEmailUsuario,
          password: negocio.notifEmailPassword,
          remitente: negocio.notifEmailRemitente || negocio.nombre
        },
        negocio.email,
        data
      ).then(result => {
        if (!result.success) {
          console.error('Error Email:', result.error);
        }
      })
    );
  }

  // WhatsApp
  if (negocio.notifWhatsappActivo && negocio.notifWhatsappApiUrl && negocio.notifWhatsappApiKey && negocio.notifWhatsappNumero) {
    promesas.push(
      enviarNotificacionWhatsapp(
        negocio.notifWhatsappApiUrl,
        negocio.notifWhatsappApiKey,
        negocio.notifWhatsappNumero,
        data
      ).then(result => {
        if (!result.success) {
          console.error('Error WhatsApp:', result.error);
        }
      })
    );
  }

  // Ejecutar todas en paralelo
  await Promise.allSettled(promesas);
}
