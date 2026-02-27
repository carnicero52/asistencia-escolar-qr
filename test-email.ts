import nodemailer from 'nodemailer';

async function testEmail() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'marcocarnicero1@gmail.com',
      pass: 'uheybtntqeangnfw',
    },
  });

  try {
    await transporter.sendMail({
      from: 'marcocarnicero1@gmail.com',
      to: 'marcocarnicero1@gmail.com',
      subject: 'Test FideliQR - Prueba de email',
      text: 'Este es un email de prueba desde FideliQR',
      html: '<h1>✅ Email funcionando</h1><p>Prueba exitosa desde FideliQR</p>',
    });
    console.log('✅ Email enviado exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testEmail();
