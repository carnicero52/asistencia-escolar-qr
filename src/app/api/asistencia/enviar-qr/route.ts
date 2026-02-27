import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empleadoId } = body;

    if (!empleadoId) {
      return NextResponse.json({ error: 'ID de empleado requerido' }, { status: 400 });
    }

    const empleado = await db.empleado.findUnique({
      where: { id: empleadoId }
    });

    if (!empleado) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    if (!empleado.email) {
      return NextResponse.json({ error: 'El empleado no tiene email registrado' }, { status: 400 });
    }

    // Obtener configuración de la empresa
    const empresa = await db.empresa.findUnique({ where: { id: 'default' } });
    const nombreEmpresa = empresa?.nombre || 'Mi Empresa';

    // Generar URL del QR
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(empleado.qrCodigo)}`;

    // Crear notificación en la base de datos
    await db.notificacion.create({
      data: {
        tipo: 'EMAIL',
        destino: empleado.email,
        asunto: `Tu código QR de acceso - ${nombreEmpresa}`,
        mensaje: `
Hola ${empleado.nombre} ${empleado.apellido},

Tu código QR de acceso ha sido generado.

Código: ${empleado.qrCodigo}

Instrucciones:
1. Guarda este código QR en tu teléfono
2. Presenta este código al escáner para marcar tu entrada/salida
3. No compartas este código con nadie

Horario de trabajo: ${empresa?.horaEntrada || '09:00'} - ${empresa?.horaSalida || '18:00'}

Saludos,
${nombreEmpresa}
        `.trim(),
        enviado: false
      }
    });

    // En un entorno de producción, aquí enviarías el email real
    // Por ahora, simulamos el envío
    console.log(`[EMAIL] Enviando QR a ${empleado.email}`);
    console.log(`Código QR: ${empleado.qrCodigo}`);
    console.log(`URL del QR: ${qrUrl}`);

    // Marcar como enviado (simulado)
    await db.notificacion.updateMany({
      where: { 
        destino: empleado.email,
        enviado: false 
      },
      data: { enviado: true }
    });

    return NextResponse.json({ 
      success: true, 
      message: `QR enviado a ${empleado.email}`,
      qrUrl
    });

  } catch (error) {
    console.error('Error enviando QR:', error);
    return NextResponse.json({ error: 'Error al enviar QR' }, { status: 500 });
  }
}
