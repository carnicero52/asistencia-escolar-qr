import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// GET - Verificar configuración de email
export async function GET(request: NextRequest) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = process.env.SMTP_PORT || '587';
  
  return NextResponse.json({
    configured: !!(smtpUser && smtpPass),
    config: {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser ? `${smtpUser.substring(0, 3)}***@${smtpUser.split('@')[1] || '...'}` : 'No configurado',
      pass: smtpPass ? '✅ Configurado' : '❌ No configurado',
    }
  });
}

// POST - Enviar email de prueba
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }
    
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    
    if (!smtpUser || !smtpPass) {
      return NextResponse.json({ 
        error: 'SMTP no configurado',
        hint: 'Agrega SMTP_USER y SMTP_PASS en las variables de entorno de Vercel'
      }, { status: 400 });
    }
    
    // Crear transportador
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    
    // Verificar conexión
    console.log('Verificando conexión SMTP...');
    try {
      await transporter.verify();
      console.log('✅ Conexión SMTP verificada');
    } catch (verifyError: any) {
      console.error('❌ Error verificando SMTP:', verifyError);
      return NextResponse.json({ 
        error: 'Error de conexión SMTP',
        details: verifyError.message,
        code: verifyError.code,
        hint: 'Verifica que SMTP_USER y SMTP_PASS sean correctos. Para Gmail, usa una contraseña de aplicación.'
      }, { status: 500 });
    }
    
    // Enviar email
    console.log('Enviando email a:', email);
    const info = await transporter.sendMail({
      from: `"FideliQR" <${smtpUser}>`,
      to: email,
      subject: '🧪 Prueba de FideliQR - Email funcionando',
      text: '¡Excelente! Las notificaciones de FideliQR están funcionando correctamente.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed;">✅ Email de Prueba - FideliQR</h2>
          <p>¡Excelente! Las notificaciones de FideliQR están funcionando correctamente.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">Este es un email de prueba enviado desde tu panel de administración.</p>
        </div>
      `
    });
    
    console.log('✅ Email enviado:', info.messageId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Email enviado exitosamente a ${email}`,
      messageId: info.messageId
    });
    
  } catch (error: any) {
    console.error('❌ Error completo:', error);
    return NextResponse.json({ 
      error: error.message || 'Error desconocido',
      code: error.code,
      command: error.command,
      hint: error.code === 'EAUTH' 
        ? 'Error de autenticación. Para Gmail, asegúrate de usar una "Contraseña de aplicación" no tu contraseña normal.'
        : 'Revisa la configuración SMTP en Vercel'
    }, { status: 500 });
  }
}
