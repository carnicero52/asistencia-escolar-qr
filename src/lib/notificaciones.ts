import { db } from '@/lib/db';
import { Resend } from 'resend';

// ─────────────────────────────────────────────────────────────
// SERVICIO DE NOTIFICACIONES
// ─────────────────────────────────────────────────────────────

interface NotificacionData {
  estudianteId: string;
  tipo: 'RETARDO' | 'AUSENCIA' | 'ENTRADA' | 'RESUMEN_DIARIO';
  datos: {
    nombreEstudiante: string;
    clase?: string;
    hora?: string;
    minutosRetraso?: number;
    fecha?: string;
    totalPresentes?: number;
    totalRetardos?: number;
    totalAusentes?: number;
  };
}

// ─────────────────────────────────────────────────────────────
// ENVIAR EMAIL
// ─────────────────────────────────────────────────────────────

export async function enviarEmail(
  destino: string,
  asunto: string,
  mensaje: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await db.configAsistencia.findUnique({
      where: { id: 'default' }
    });

    if (!config?.emailRemitente) {
      return { success: false, error: 'No hay email remitente configurado' };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: `${config.nombreRemitente || 'Sistema de Asistencia'} <${config.emailRemitente}>`,
      to: destino,
      subject: asunto,
      html: html,
      text: mensaje,
    });

    if (error) {
      console.error('Error enviando email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error enviando email:', error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// ENVIAR TELEGRAM (usa chat_id directamente)
// ─────────────────────────────────────────────────────────────

export async function enviarTelegram(
  chatId: string,
  mensaje: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await db.configAsistencia.findUnique({
      where: { id: 'default' }
    });

    if (!config?.telegramBotToken) {
      return { success: false, error: 'No hay bot de Telegram configurado' };
    }

    const response = await fetch(
      `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: mensaje,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error('Error enviando Telegram:', data);
      return { success: false, error: data.description };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error enviando Telegram:', error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// PLANTILLAS DE MENSAJES
// ─────────────────────────────────────────────────────────────

function generarMensajeRetardoPadre(datos: NotificacionData['datos']): { asunto: string; mensaje: string; html: string } {
  const asunto = `⚠️ ${datos.nombreEstudiante} llegó tarde a clases`;
  const mensaje = `
Estimado Padre/Tutor,

Le informamos que ${datos.nombreEstudiante} llegó con retraso a la clase de ${datos.clase}.

📅 Fecha: ${datos.fecha}
🕐 Hora de llegada: ${datos.hora}
⏱️ Minutos de retraso: ${datos.minutosRetraso} minutos

Por favor, asegúrese de que su hijo llegue a tiempo a sus clases.

Atentamente,
Sistema de Asistencia Escolar
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0;">⚠️ Retardo Registrado</h1>
      </div>
      <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <p style="font-size: 16px;">Estimado Padre/Tutor,</p>
        <p style="font-size: 16px;">Le informamos que <strong>${datos.nombreEstudiante}</strong> llegó con retraso a la clase de <strong>${datos.clase}</strong>.</p>
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 5px 0;">📅 <strong>Fecha:</strong> ${datos.fecha}</p>
          <p style="margin: 5px 0;">🕐 <strong>Hora de llegada:</strong> ${datos.hora}</p>
          <p style="margin: 5px 0;">⏱️ <strong>Minutos de retraso:</strong> ${datos.minutosRetraso} minutos</p>
        </div>
        <p style="font-size: 14px; color: #6b7280;">Por favor, asegúrese de que su hijo llegue a tiempo a sus clases.</p>
      </div>
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
        Sistema de Asistencia Escolar
      </p>
    </div>
  `;

  return { asunto, mensaje, html };
}

function generarMensajeAusenciaPadre(datos: NotificacionData['datos']): { asunto: string; mensaje: string; html: string } {
  const asunto = `❌ ${datos.nombreEstudiante} no asistió a clases`;
  const mensaje = `
Estimado Padre/Tutor,

Le informamos que ${datos.nombreEstudiante} NO asistió a la clase de ${datos.clase} el día de hoy.

📅 Fecha: ${datos.fecha}

Si su hijo tuvo una razón justificada para no asistir, por favor comuníquese con la institución.

Atentamente,
Sistema de Asistencia Escolar
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0;">❌ Ausencia Registrada</h1>
      </div>
      <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <p style="font-size: 16px;">Estimado Padre/Tutor,</p>
        <p style="font-size: 16px;">Le informamos que <strong>${datos.nombreEstudiante}</strong> NO asistió a la clase de <strong>${datos.clase}</strong> el día de hoy.</p>
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 5px 0;">📅 <strong>Fecha:</strong> ${datos.fecha}</p>
          <p style="margin: 5px 0;">📚 <strong>Clase:</strong> ${datos.clase}</p>
        </div>
        <p style="font-size: 14px; color: #6b7280;">Si su hijo tuvo una razón justificada para no asistir, por favor comuníquese con la institución.</p>
      </div>
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
        Sistema de Asistencia Escolar
      </p>
    </div>
  `;

  return { asunto, mensaje, html };
}

function generarMensajeEntradaPadre(datos: NotificacionData['datos']): { asunto: string; mensaje: string; html: string } {
  const asunto = `✅ ${datos.nombreEstudiante} llegó a clases`;
  const mensaje = `
Estimado Padre/Tutor,

Le informamos que ${datos.nombreEstudiante} llegó a tiempo a la clase de ${datos.clase}.

📅 Fecha: ${datos.fecha}
🕐 Hora de llegada: ${datos.hora}

Atentamente,
Sistema de Asistencia Escolar
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0;">✅ Asistencia Registrada</h1>
      </div>
      <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <p style="font-size: 16px;">Estimado Padre/Tutor,</p>
        <p style="font-size: 16px;">Le informamos que <strong>${datos.nombreEstudiante}</strong> llegó a tiempo a la clase de <strong>${datos.clase}</strong>.</p>
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 5px 0;">📅 <strong>Fecha:</strong> ${datos.fecha}</p>
          <p style="margin: 5px 0;">🕐 <strong>Hora de llegada:</strong> ${datos.hora}</p>
        </div>
      </div>
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
        Sistema de Asistencia Escolar
      </p>
    </div>
  `;

  return { asunto, mensaje, html };
}

function generarMensajeTelegramRetardo(datos: NotificacionData['datos'], nombreInstitucion: string): string {
  return `
⚠️ <b>RETARDO REGISTRADO</b>

👨‍🎓 <b>Estudiante:</b> ${datos.nombreEstudiante}
📚 <b>Clase:</b> ${datos.clase}
📅 <b>Fecha:</b> ${datos.fecha}
🕐 <b>Hora:</b> ${datos.hora}
⏱️ <b>Retraso:</b> ${datos.minutosRetraso} minutos

<i>${nombreInstitucion}</i>
  `.trim();
}

function generarMensajeTelegramAusencia(datos: NotificacionData['datos'], nombreInstitucion: string): string {
  return `
❌ <b>AUSENCIA REGISTRADA</b>

👨‍🎓 <b>Estudiante:</b> ${datos.nombreEstudiante}
📚 <b>Clase:</b> ${datos.clase}
📅 <b>Fecha:</b> ${datos.fecha}

<i>${nombreInstitucion}</i>
  `.trim();
}

function generarMensajeTelegramEntrada(datos: NotificacionData['datos'], nombreInstitucion: string): string {
  return `
✅ <b>ASISTENCIA REGISTRADA</b>

👨‍🎓 <b>Estudiante:</b> ${datos.nombreEstudiante}
📚 <b>Clase:</b> ${datos.clase}
📅 <b>Fecha:</b> ${datos.fecha}
🕐 <b>Hora:</b> ${datos.hora}

<i>${nombreInstitucion}</i>
  `.trim();
}

function generarMensajeTelegramResumen(datos: NotificacionData['datos'], nombreInstitucion: string): string {
  return `
📊 <b>RESUMEN DIARIO DE ASISTENCIA</b>

📅 <b>Fecha:</b> ${datos.fecha}

✅ <b>Presentes:</b> ${datos.totalPresentes}
⚠️ <b>Retardos:</b> ${datos.totalRetardos}
❌ <b>Ausentes:</b> ${datos.totalAusentes}

<i>${nombreInstitucion}</i>
  `.trim();
}

// ─────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DE NOTIFICACIÓN
// ─────────────────────────────────────────────────────────────

export async function enviarNotificacion(data: NotificacionData): Promise<void> {
  const config = await db.configAsistencia.findUnique({
    where: { id: 'default' }
  });

  if (!config?.enviarNotificaciones) {
    console.log('Notificaciones desactivadas');
    return;
  }

  const estudiante = await db.estudiante.findUnique({
    where: { id: data.estudianteId }
  });

  if (!estudiante) {
    console.error('Estudiante no encontrado');
    return;
  }

  const { tipo, datos } = data;
  const nombreInstitucion = config.nombreInstitucion;

  // ─────────────────────────────────────────────────────────
  // NOTIFICACIONES AL PADRE
  // ─────────────────────────────────────────────────────────

  if (tipo === 'RETARDO' && config.notificarRetardo) {
    const plantilla = generarMensajeRetardoPadre(datos);
    const telegramMsg = generarMensajeTelegramRetardo(datos, nombreInstitucion);

    // Email al padre
    if (estudiante.emailPadre) {
      const resultado = await enviarEmail(
        estudiante.emailPadre,
        plantilla.asunto,
        plantilla.mensaje,
        plantilla.html
      );
      await guardarNotificacion({
        estudianteId: estudiante.id,
        tipo: 'RETARDO',
        canal: 'EMAIL_PADRE',
        destino: estudiante.emailPadre,
        asunto: plantilla.asunto,
        mensaje: plantilla.mensaje,
        enviado: resultado.success,
        error: resultado.error
      });
    }

    // Email a la madre
    if (estudiante.emailMadre) {
      const resultado = await enviarEmail(
        estudiante.emailMadre,
        plantilla.asunto,
        plantilla.mensaje,
        plantilla.html
      );
      await guardarNotificacion({
        estudianteId: estudiante.id,
        tipo: 'RETARDO',
        canal: 'EMAIL_MADRE',
        destino: estudiante.emailMadre,
        asunto: plantilla.asunto,
        mensaje: plantilla.mensaje,
        enviado: resultado.success,
        error: resultado.error
      });
    }

    // Telegram DIRECTO al padre (usa chat_id)
    if (estudiante.telegramChatIdPadre && config.telegramBotToken && config.enviarTelegramPadres) {
      const resultado = await enviarTelegram(estudiante.telegramChatIdPadre, telegramMsg);
      await guardarNotificacion({
        estudianteId: estudiante.id,
        tipo: 'RETARDO',
        canal: 'TELEGRAM_PADRE',
        destino: estudiante.telegramChatIdPadre,
        mensaje: telegramMsg,
        enviado: resultado.success,
        error: resultado.error
      });
    }

    // Telegram DIRECTO a la madre (usa chat_id)
    if (estudiante.telegramChatIdMadre && config.telegramBotToken && config.enviarTelegramPadres) {
      const resultado = await enviarTelegram(estudiante.telegramChatIdMadre, telegramMsg);
      await guardarNotificacion({
        estudianteId: estudiante.id,
        tipo: 'RETARDO',
        canal: 'TELEGRAM_MADRE',
        destino: estudiante.telegramChatIdMadre,
        mensaje: telegramMsg,
        enviado: resultado.success,
        error: resultado.error
      });
    }
  }

  if (tipo === 'AUSENCIA' && config.notificarAusencia) {
    const plantilla = generarMensajeAusenciaPadre(datos);
    const telegramMsg = generarMensajeTelegramAusencia(datos, nombreInstitucion);

    // Email al padre
    if (estudiante.emailPadre) {
      const resultado = await enviarEmail(
        estudiante.emailPadre,
        plantilla.asunto,
        plantilla.mensaje,
        plantilla.html
      );
      await guardarNotificacion({
        estudianteId: estudiante.id,
        tipo: 'AUSENCIA',
        canal: 'EMAIL_PADRE',
        destino: estudiante.emailPadre,
        asunto: plantilla.asunto,
        mensaje: plantilla.mensaje,
        enviado: resultado.success,
        error: resultado.error
      });
    }

    // Email a la madre
    if (estudiante.emailMadre) {
      const resultado = await enviarEmail(
        estudiante.emailMadre,
        plantilla.asunto,
        plantilla.mensaje,
        plantilla.html
      );
      await guardarNotificacion({
        estudianteId: estudiante.id,
        tipo: 'AUSENCIA',
        canal: 'EMAIL_MADRE',
        destino: estudiante.emailMadre,
        asunto: plantilla.asunto,
        mensaje: plantilla.mensaje,
        enviado: resultado.success,
        error: resultado.error
      });
    }

    // Telegram DIRECTO al padre (usa chat_id)
    if (estudiante.telegramChatIdPadre && config.telegramBotToken && config.enviarTelegramPadres) {
      const resultado = await enviarTelegram(estudiante.telegramChatIdPadre, telegramMsg);
      await guardarNotificacion({
        estudianteId: estudiante.id,
        tipo: 'AUSENCIA',
        canal: 'TELEGRAM_PADRE',
        destino: estudiante.telegramChatIdPadre,
        mensaje: telegramMsg,
        enviado: resultado.success,
        error: resultado.error
      });
    }

    // Telegram DIRECTO a la madre (usa chat_id)
    if (estudiante.telegramChatIdMadre && config.telegramBotToken && config.enviarTelegramPadres) {
      const resultado = await enviarTelegram(estudiante.telegramChatIdMadre, telegramMsg);
      await guardarNotificacion({
        estudianteId: estudiante.id,
        tipo: 'AUSENCIA',
        canal: 'TELEGRAM_MADRE',
        destino: estudiante.telegramChatIdMadre,
        mensaje: telegramMsg,
        enviado: resultado.success,
        error: resultado.error
      });
    }
  }

  if (tipo === 'ENTRADA' && config.notificarEntrada) {
    const plantilla = generarMensajeEntradaPadre(datos);
    const telegramMsg = generarMensajeTelegramEntrada(datos, nombreInstitucion);

    // Email al padre
    if (estudiante.emailPadre) {
      const resultado = await enviarEmail(
        estudiante.emailPadre,
        plantilla.asunto,
        plantilla.mensaje,
        plantilla.html
      );
      await guardarNotificacion({
        estudianteId: estudiante.id,
        tipo: 'ENTRADA',
        canal: 'EMAIL_PADRE',
        destino: estudiante.emailPadre,
        asunto: plantilla.asunto,
        mensaje: plantilla.mensaje,
        enviado: resultado.success,
        error: resultado.error
      });
    }

    // Telegram DIRECTO al padre
    if (estudiante.telegramChatIdPadre && config.telegramBotToken && config.enviarTelegramPadres) {
      const resultado = await enviarTelegram(estudiante.telegramChatIdPadre, telegramMsg);
      await guardarNotificacion({
        estudianteId: estudiante.id,
        tipo: 'ENTRADA',
        canal: 'TELEGRAM_PADRE',
        destino: estudiante.telegramChatIdPadre,
        mensaje: telegramMsg,
        enviado: resultado.success,
        error: resultado.error
      });
    }

    // Telegram DIRECTO a la madre
    if (estudiante.telegramChatIdMadre && config.telegramBotToken && config.enviarTelegramPadres) {
      const resultado = await enviarTelegram(estudiante.telegramChatIdMadre, telegramMsg);
      await guardarNotificacion({
        estudianteId: estudiante.id,
        tipo: 'ENTRADA',
        canal: 'TELEGRAM_MADRE',
        destino: estudiante.telegramChatIdMadre,
        mensaje: telegramMsg,
        enviado: resultado.success,
        error: resultado.error
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // NOTIFICACIONES AL DIRECTOR (grupo de Telegram)
  // ─────────────────────────────────────────────────────────

  if (tipo === 'RESUMEN_DIARIO' && config.enviarTelegram && config.telegramChatId) {
    const telegramMsg = generarMensajeTelegramResumen(datos, nombreInstitucion);
    await enviarTelegram(config.telegramChatId, telegramMsg);
  }
}

// ─────────────────────────────────────────────────────────────
// GUARDAR REGISTRO DE NOTIFICACIÓN
// ─────────────────────────────────────────────────────────────

async function guardarNotificacion(params: {
  estudianteId: string;
  tipo: string;
  canal: string;
  destino: string;
  asunto?: string;
  mensaje: string;
  enviado: boolean;
  error?: string;
}) {
  try {
    await db.notificacionAsistencia.create({
      data: {
        estudianteId: params.estudianteId,
        tipo: params.tipo,
        canal: params.canal,
        destino: params.destino,
        asunto: params.asunto,
        mensaje: params.mensaje,
        enviado: params.enviado,
        error: params.error,
        fechaEnvio: params.enviado ? new Date() : null
      }
    });
  } catch (error) {
    console.error('Error guardando notificación:', error);
  }
}

// ─────────────────────────────────────────────────────────────
// VERIFICAR AUSENCIAS Y ENVIAR NOTIFICACIONES
// ─────────────────────────────────────────────────────────────

export async function verificarAusenciasYNotificar() {
  const config = await db.configAsistencia.findUnique({
    where: { id: 'default' }
  });

  if (!config?.notificarAusencia) return;

  const hoy = new Date().toISOString().split('T')[0];
  const diaSemana = new Date().getDay() || 7;

  // Obtener clases de hoy
  const clasesHoy = await db.clase.findMany({
    where: { diaSemana, activa: true }
  });

  if (clasesHoy.length === 0) return;

  // Obtener todos los estudiantes activos
  const estudiantes = await db.estudiante.findMany({
    where: { activo: true },
    include: {
      asistencias: {
        where: { fecha: hoy }
      }
    }
  });

  for (const estudiante of estudiantes) {
    for (const clase of clasesHoy) {
      // Verificar si ya se registró asistencia
      const asistencia = estudiante.asistencias.find(a => a.claseId === clase.id);
      
      // Si no hay asistencia y ya pasó la hora de la clase
      if (!asistencia) {
        const ahora = new Date();
        const [hFin, mFin] = clase.horaFin.split(':').map(Number);
        const finClase = new Date();
        finClase.setHours(hFin, mFin, 0);

        if (ahora > finClase) {
          // Marcar como ausente y notificar
          await db.asistenciaEstudiante.create({
            data: {
              estudianteId: estudiante.id,
              claseId: clase.id,
              fecha: hoy,
              horaRegistro: '00:00:00',
              estado: 'AUSENTE',
              minutosRetraso: 0
            }
          });

          await enviarNotificacion({
            estudianteId: estudiante.id,
            tipo: 'AUSENCIA',
            datos: {
              nombreEstudiante: `${estudiante.nombre} ${estudiante.apellido}`,
              clase: clase.nombre,
              fecha: hoy
            }
          });
        }
      }
    }
  }
}
