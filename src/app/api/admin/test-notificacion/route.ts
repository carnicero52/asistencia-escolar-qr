import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db-libsql';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
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

    // Obtener negocio completo
    const negocioResult = await db.execute({
      sql: 'SELECT * FROM Negocio WHERE id = ?',
      args: [sesion.negocioId as string]
    });

    const negocio = negocioResult.rows[0] as any;
    const { tipo } = await request.json();

    if (tipo === 'telegram') {
      if (!negocio.notifTelegramBotToken || !negocio.notifTelegramChatId) {
        return NextResponse.json({ error: 'Configura el Bot Token y Chat ID de Telegram' }, { status: 400 });
      }

      const mensaje = `
🧪 *PRUEBA DE NOTIFICACIÓN* 🧪

🏢 *Negocio:* ${negocio.nombre}
✅ *Estado:* ¡Las notificaciones funcionan correctamente!

📅 *Fecha:* ${new Date().toLocaleDateString('es-MX')}
      `.trim();

      const response = await fetch(
        `https://api.telegram.org/bot${negocio.notifTelegramBotToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: negocio.notifTelegramChatId,
            text: mensaje,
            parse_mode: 'Markdown'
          })
        }
      );

      const result = await response.json();
      
      if (!result.ok) {
        return NextResponse.json({ error: result.description || 'Error al enviar a Telegram' }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (tipo === 'email') {
      if (!negocio.notifEmailSmtp || !negocio.notifEmailUsuario || !negocio.notifEmailPassword) {
        return NextResponse.json({ error: 'Configura el servidor SMTP, usuario y contraseña' }, { status: 400 });
      }

      const transporter = nodemailer.createTransport({
        host: negocio.notifEmailSmtp,
        port: negocio.notifEmailPuerto || 587,
        secure: negocio.notifEmailPuerto === 465,
        auth: {
          user: negocio.notifEmailUsuario,
          pass: negocio.notifEmailPassword
        }
      });

      await transporter.sendMail({
        from: `"${negocio.notifEmailRemitente || negocio.nombre}" <${negocio.notifEmailUsuario}>`,
        to: negocio.email,
        subject: '🧪 Prueba de Notificación - ContrataFácil',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981, #0d9488); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">🧪 Prueba de Notificación</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px;">
              <p><strong>¡Las notificaciones funcionan correctamente!</strong></p>
              <p>Negocio: <strong>${negocio.nombre}</strong></p>
              <p>Fecha: ${new Date().toLocaleDateString('es-MX')}</p>
            </div>
          </div>
        `
      });

      return NextResponse.json({ success: true });
    }

    if (tipo === 'whatsapp') {
      if (!negocio.notifWhatsappApiUrl || !negocio.notifWhatsappApiKey || !negocio.notifWhatsappNumero) {
        return NextResponse.json({ error: 'Configura la URL, API Key y número de WhatsApp' }, { status: 400 });
      }

      const mensaje = `🧪 *PRUEBA DE NOTIFICACIÓN*\n\n` +
        `🏢 Negocio: ${negocio.nombre}\n` +
        `✅ ¡Las notificaciones funcionan!\n\n` +
        `📅 ${new Date().toLocaleDateString('es-MX')}`;

      const response = await fetch(negocio.notifWhatsappApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${negocio.notifWhatsappApiKey}`,
          'X-API-Key': negocio.notifWhatsappApiKey
        },
        body: JSON.stringify({
          to: negocio.notifWhatsappNumero,
          message: mensaje,
          type: 'text'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json({ error: `Error en la API: ${error}` }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Tipo de notificación no válido' }, { status: 400 });
  } catch (error: any) {
    console.error('Error al enviar notificación de prueba:', error);
    return NextResponse.json({ error: error.message || 'Error al enviar notificación' }, { status: 500 });
  }
}
