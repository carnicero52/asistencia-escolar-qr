import nodemailer from 'nodemailer';

// Configuración del transportador de email
function createTransporter() {
  // Para desarrollo, usamos configuración de Gmail con App Password
  // En producción, usar variables de entorno
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });
}

// Interfaz para datos de email
interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Verificar si hay configuración SMTP
export function hasEmailConfig(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Enviar email
export async function sendEmail(data: EmailData): Promise<boolean> {
  // Log de configuración (para debug)
  console.log('📧 sendEmail llamado');
  console.log('   SMTP_USER:', process.env.SMTP_USER ? '✅ Configurado' : '❌ No configurado');
  console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ Configurado' : '❌ No configurado');
  console.log('   Destinatario:', data.to);

  // Si no hay configuración SMTP, simular envío
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [SIMULADO] Email enviado a:', data.to);
    console.log('   Asunto:', data.subject);
    console.log('   Cuerpo:', data.text.substring(0, 100) + '...');
    console.log('   💡 Para enviar emails reales, configura SMTP en .env');
    return true;
  }

  try {
    const transporter = createTransporter();

    // Verificar conexión SMTP
    console.log('   Verificando conexión SMTP...');
    await transporter.verify();
    console.log('   ✅ Conexión SMTP verificada');

    const info = await transporter.sendMail({
      from: `"FideliQR" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html || `<p>${data.text}</p>`,
    });
    console.log('📧 ✅ Email enviado exitosamente a:', data.to);
    console.log('   Message ID:', info.messageId);
    return true;
  } catch (error: any) {
    console.error('📧 ❌ Error enviando email:');
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

// Enviar notificación de nuevo cliente al dueño
export async function notifyNewClienteToOwner(params: {
  ownerEmail: string;
  negocioNombre: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono?: string | null;
}): Promise<void> {
  const { ownerEmail, negocioNombre, clienteNombre, clienteEmail, clienteTelefono } = params;

  await sendEmail({
    to: ownerEmail,
    subject: `🎉 Nuevo cliente registrado - ${negocioNombre}`,
    text: `¡Tienes un nuevo cliente!\n\nNombre: ${clienteNombre}\nEmail: ${clienteEmail}${clienteTelefono ? `\nTeléfono: ${clienteTelefono}` : ''}\n\nRegístrate en FideliQR para ver más detalles.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">🎉 ¡Nuevo cliente registrado!</h2>
        <p>Tienes un nuevo cliente en <strong>${negocioNombre}</strong>:</p>
        <ul>
          <li><strong>Nombre:</strong> ${clienteNombre}</li>
          <li><strong>Email:</strong> ${clienteEmail}</li>
          ${clienteTelefono ? `<li><strong>Teléfono:</strong> ${clienteTelefono}</li>` : ''}
        </ul>
        <p>Ingresa a tu panel de administración para ver más detalles.</p>
      </div>
    `,
  });
}

// Enviar notificación de recompensa al cliente
export async function notifyRewardToCliente(params: {
  clienteEmail: string;
  clienteNombre: string;
  negocioNombre: string;
  comprasTotal: number;
}): Promise<void> {
  const { clienteEmail, clienteNombre, negocioNombre, comprasTotal } = params;

  await sendEmail({
    to: clienteEmail,
    subject: `🎁 ¡Felicidades! Tienes una recompensa en ${negocioNombre}`,
    text: `¡Hola ${clienteNombre}!\n\n¡Felicidades! Has acumulado ${comprasTotal} compras en ${negocioNombre} y has ganado una recompensa.\n\nAcércate a la caja para reclamar tu producto gratis o descuento.\n\n¡Gracias por tu preferencia!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">🎁 ¡Felicidades ${clienteNombre}!</h2>
        <p>Has acumulado <strong>${comprasTotal} compras</strong> en <strong>${negocioNombre}</strong> y has ganado una recompensa.</p>
        <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px;">🏆 Acércate a la caja para reclamar tu producto gratis o descuento.</p>
        </div>
        <p>¡Gracias por tu preferencia!</p>
      </div>
    `,
  });
}

// Enviar notificación de recompensa al dueño
export async function notifyRewardToOwner(params: {
  ownerEmail: string;
  negocioNombre: string;
  clienteNombre: string;
  clienteEmail: string;
  comprasTotal: number;
}): Promise<void> {
  const { ownerEmail, negocioNombre, clienteNombre, clienteEmail, comprasTotal } = params;

  await sendEmail({
    to: ownerEmail,
    subject: `🎁 Cliente alcanzó recompensa - ${negocioNombre}`,
    text: `El cliente ${clienteNombre} (${clienteEmail}) ha alcanzado ${comprasTotal} compras y obtuvo una recompensa.\n\nRecuerda entregar el premio cuando el cliente lo solicite.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">🎁 ¡Cliente con recompensa!</h2>
        <p>El cliente <strong>${clienteNombre}</strong> ha alcanzado ${comprasTotal} compras.</p>
        <p>Email: ${clienteEmail}</p>
        <p>Recuerda entregar el premio cuando el cliente lo solicite.</p>
      </div>
    `,
  });
}
