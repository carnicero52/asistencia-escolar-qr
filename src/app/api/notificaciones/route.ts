import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Enviar notificación
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { tipo, mensaje, producto } = data;

    // Obtener configuración
    const config = await db.configuracion.findUnique({
      where: { id: 'default' }
    });

    if (!config) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
    }

    const resultados: { telegram?: boolean; email?: boolean } = {};

    // Enviar por Telegram
    if (config.notificacionesTelegram && config.telegramBotToken && config.telegramChatId) {
      try {
        const telegramUrl = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
        const emoji = tipo === 'SIN_STOCK' ? '🚨' : tipo === 'STOCK_BAJO' ? '⚠️' : tipo === 'VENTA' ? '📤' : tipo === 'COMPRA' ? '📥' : '📢';
        
        const telegramMessage = `${emoji} <b>${tipo.replace(/_/g, ' ')}</b>

${mensaje}

📅 ${new Date().toLocaleString('es-ES')}
🏢 ${config.nombreNegocio}`;

        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.telegramChatId,
            text: telegramMessage,
            parse_mode: 'HTML'
          })
        });

        resultados.telegram = response.ok;

        // Guardar registro
        await db.notificacion.create({
          data: {
            tipo: 'TELEGRAM',
            destinatario: config.telegramChatId,
            mensaje: telegramMessage,
            exito: response.ok
          }
        });
      } catch (error) {
        console.error('Error enviando Telegram:', error);
        resultados.telegram = false;
      }
    }

    // Enviar por Email (usando API externa o servicio)
    if (config.notificacionesEmail && config.emailPropietario) {
      try {
        // Aquí se integraría con un servicio de email
        // Por ahora solo registramos
        await db.notificacion.create({
          data: {
            tipo: 'EMAIL',
            destinatario: config.emailPropietario,
            asunto: `[${config.nombreNegocio}] ${tipo.replace(/_/g, ' ')}`,
            mensaje,
            exito: true
          }
        });
        resultados.email = true;
      } catch (error) {
        console.error('Error enviando Email:', error);
        resultados.email = false;
      }
    }

    return NextResponse.json({ success: true, resultados });
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    return NextResponse.json({ error: 'Error al enviar notificación' }, { status: 500 });
  }
}

// GET - Verificar stock bajo y enviar alertas
export async function GET() {
  try {
    const config = await db.configuracion.findUnique({
      where: { id: 'default' }
    });

    if (!config || !config.notificacionesTelegram || !config.telegramBotToken) {
      return NextResponse.json({ error: 'Notificaciones no configuradas' }, { status: 400 });
    }

    // Obtener productos con stock bajo
    const productos = await db.producto.findMany({
      where: { activo: true }
    });

    const alertasStock = productos.filter(p => p.stock <= p.stockMinimo);

    if (alertasStock.length === 0) {
      return NextResponse.json({ mensaje: 'Sin alertas de stock' });
    }

    // Enviar resumen por Telegram
    let mensajeTelegram = `📊 <b>RESUMEN DE INVENTARIO</b>

⚠️ <b>Productos con alertas:</b> ${alertasStock.length}

`;

    alertasStock.forEach(p => {
      const estado = p.stock === 0 ? '🚨 SIN STOCK' : '⚠️ STOCK BAJO';
      mensajeTelegram += `${estado} - ${p.nombre}
   Stock: ${p.stock} | Mínimo: ${p.stockMinimo}

`;
    });

    mensajeTelegram += `📅 ${new Date().toLocaleString('es-ES')}
🏢 ${config.nombreNegocio}`;

    const telegramUrl = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: mensajeTelegram,
        parse_mode: 'HTML'
      })
    });

    return NextResponse.json({ 
      success: response.ok, 
      alertasEnviadas: alertasStock.length 
    });
  } catch (error) {
    console.error('Error al verificar stock:', error);
    return NextResponse.json({ error: 'Error al verificar stock' }, { status: 500 });
  }
}
