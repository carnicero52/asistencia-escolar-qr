import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db-libsql';
import { cookies } from 'next/headers';
import { enviarNotificacionTelegram, enviarNotificacionWhatsapp } from '@/lib/notificaciones';
import nodemailer from 'nodemailer';
import { nanoid } from 'nanoid';

// Obtener candidatos del negocio
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getDb();
    
    const sesionResult = await db.execute({
      sql: 'SELECT * FROM Sesion WHERE token = ?',
      args: [token]
    });

    if (sesionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    }

    const sesion = sesionResult.rows[0];
    if (new Date(sesion.expiresAt as string) < new Date()) {
      return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    }

    const candidatos = await db.execute({
      sql: 'SELECT * FROM Candidato WHERE negocioId = ? ORDER BY createdAt DESC',
      args: [sesion.negocioId as string]
    });

    return NextResponse.json({ candidatos: candidatos.rows });
  } catch (error) {
    console.error('Error al obtener candidatos:', error);
    return NextResponse.json({ error: 'Error al obtener candidatos' }, { status: 500 });
  }
}

// Crear nuevo candidato (desde la página pública)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { slug, ...candidatoData } = data;
    const db = getDb();

    // Buscar el negocio por slug
    const negocioResult = await db.execute({
      sql: 'SELECT * FROM Negocio WHERE slug = ?',
      args: [slug]
    });

    if (negocioResult.rows.length === 0) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const negocio = negocioResult.rows[0];

    if (negocio.buscandoPersonal !== 1) {
      return NextResponse.json({ error: 'Este negocio no está recibiendo aplicaciones' }, { status: 400 });
    }

    // Verificar si ya aplicó con ese email
    const existente = await db.execute({
      sql: 'SELECT id FROM Candidato WHERE negocioId = ? AND email = ?',
      args: [negocio.id as string, candidatoData.email]
    });

    if (existente.rows.length > 0) {
      return NextResponse.json({ error: 'Ya has aplicado anteriormente con este email' }, { status: 400 });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO Candidato (id, negocioId, nombre, email, telefono, direccion, fechaNacimiento, 
            puestoSolicitado, experiencia, educacion, habilidades, experienciaDetallada, disponibilidad, 
            cvUrl, fotoUrl, estado, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuevo', ?, ?)`,
      args: [
        id, negocio.id, candidatoData.nombre, candidatoData.email, candidatoData.telefono,
        candidatoData.direccion || null, candidatoData.fechaNacimiento || null,
        candidatoData.puestoSolicitado || null, candidatoData.experiencia || null,
        candidatoData.educacion || null, candidatoData.habilidades || null,
        candidatoData.experienciaDetallada || null, candidatoData.disponibilidad || null,
        candidatoData.cvUrl || null, candidatoData.fotoUrl || null, now, now
      ]
    });

    // Enviar notificaciones en background
    enviarNotificacionesAsync(negocio, candidatoData);

    return NextResponse.json({ 
      success: true, 
      message: 'Tu aplicación ha sido enviada correctamente',
      candidato: { id, nombre: candidatoData.nombre }
    });
  } catch (error) {
    console.error('Error al crear candidato:', error);
    return NextResponse.json({ error: 'Error al enviar la aplicación' }, { status: 500 });
  }
}

// Eliminar TODOS los candidatos del negocio
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getDb();

    const sesionResult = await db.execute({
      sql: 'SELECT * FROM Sesion WHERE token = ?',
      args: [token]
    });

    if (sesionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    }

    const sesion = sesionResult.rows[0];

    const result = await db.execute({
      sql: 'DELETE FROM Candidato WHERE negocioId = ?',
      args: [sesion.negocioId as string]
    });

    return NextResponse.json({ 
      success: true, 
      eliminados: result.rowsAffected || 0 
    });
  } catch (error) {
    console.error('Error al eliminar candidatos:', error);
    return NextResponse.json({ error: 'Error al eliminar candidatos' }, { status: 500 });
  }
}

// Función para enviar notificaciones
async function enviarNotificacionesAsync(negocio: any, candidato: any) {
  const promesas: Promise<void>[] = [];

  // Telegram
  if (negocio.notifTelegramActivo === 1 && negocio.notifTelegramBotToken && negocio.notifTelegramChatId) {
    promesas.push(
      enviarNotificacionTelegram(
        negocio.notifTelegramBotToken,
        negocio.notifTelegramChatId,
        {
          nombreNegocio: negocio.nombre,
          nombreCandidato: candidato.nombre,
          emailCandidato: candidato.email,
          telefonoCandidato: candidato.telefono,
          puestoSolicitado: candidato.puestoSolicitado,
          experiencia: candidato.experiencia
        }
      ).then(result => {
        if (!result.success) console.error('Error Telegram:', result.error);
      })
    );
  }

  // Email
  if (negocio.notifEmailActivo === 1 && negocio.notifEmailSmtp && negocio.notifEmailUsuario && negocio.notifEmailPassword) {
    promesas.push(
      enviarEmail(
        {
          smtp: negocio.notifEmailSmtp,
          puerto: negocio.notifEmailPuerto || 587,
          usuario: negocio.notifEmailUsuario,
          password: negocio.notifEmailPassword,
          remitente: negocio.notifEmailRemitente || negocio.nombre
        },
        negocio.email,
        {
          nombreNegocio: negocio.nombre,
          nombreCandidato: candidato.nombre,
          emailCandidato: candidato.email,
          telefonoCandidato: candidato.telefono,
          puestoSolicitado: candidato.puestoSolicitado,
          experiencia: candidato.experiencia
        }
      )
    );
  }

  // WhatsApp
  if (negocio.notifWhatsappActivo === 1 && negocio.notifWhatsappApiUrl && negocio.notifWhatsappApiKey && negocio.notifWhatsappNumero) {
    promesas.push(
      enviarNotificacionWhatsapp(
        negocio.notifWhatsappApiUrl,
        negocio.notifWhatsappApiKey,
        negocio.notifWhatsappNumero,
        {
          nombreNegocio: negocio.nombre,
          nombreCandidato: candidato.nombre,
          emailCandidato: candidato.email,
          telefonoCandidato: candidato.telefono,
          puestoSolicitado: candidato.puestoSolicitado,
          experiencia: candidato.experiencia
        }
      ).then(result => {
        if (!result.success) console.error('Error WhatsApp:', result.error);
      })
    );
  }

  await Promise.allSettled(promesas);
}

async function enviarEmail(config: any, emailDestino: string, data: any): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp,
      port: config.puerto,
      secure: config.puerto === 465,
      auth: { user: config.usuario, pass: config.password }
    });

    await transporter.sendMail({
      from: `"${config.remitente}" <${config.usuario}>`,
      to: emailDestino,
      subject: `🔔 Nuevo candidato: ${data.nombreCandidato}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981, #0d9488); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🔔 Nuevo Candidato</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px;">
            <p>Has recibido una nueva aplicación en <strong>${data.nombreNegocio}</strong></p>
            <div style="background: white; padding: 15px; border-radius: 8px;">
              <h3>👤 ${data.nombreCandidato}</h3>
              <p>📧 ${data.emailCandidato}</p>
              <p>📱 ${data.telefonoCandidato}</p>
              ${data.puestoSolicitado ? `<p>💼 ${data.puestoSolicitado}</p>` : ''}
            </div>
          </div>
        </div>
      `
    });
  } catch (error) {
    console.error('Error enviando email:', error);
  }
}
