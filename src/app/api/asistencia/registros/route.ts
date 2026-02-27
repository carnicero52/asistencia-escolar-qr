import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Listar registros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const empleadoId = searchParams.get('empleadoId');
    
    let where: any = {};
    if (fecha) where.fecha = fecha;
    if (empleadoId) where.empleadoId = empleadoId;
    
    const registros = await db.registro.findMany({
      where,
      include: { empleado: true },
      orderBy: { timestamp: 'desc' }
    });
    
    // Si no hay registros, devolver array vacío
    if (!registros || registros.length === 0) {
      // Crear datos de demostración
      const empleados = await db.empleado.findMany({ where: { activo: true } });
      
      if (empleados.length === 0) {
        // Crear empleados de demo
        const demoEmpleados = [
          { id: 'emp1', codigo: 'EMP001', nombre: 'Juan', apellido: 'Pérez', qrCodigo: 'QR-DEMO001' },
          { id: 'emp2', codigo: 'EMP002', nombre: 'María', apellido: 'García', qrCodigo: 'QR-DEMO002' },
          { id: 'emp3', codigo: 'EMP003', nombre: 'Carlos', apellido: 'López', qrCodigo: 'QR-DEMO003' },
        ];
        
        for (const emp of demoEmpleados) {
          await db.empleado.create({
            data: { ...emp, activo: true } as any
          });
        }
      }
      
      return NextResponse.json([]);
    }
    
    return NextResponse.json(registros);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST - Crear registro (marcar entrada/salida)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empleadoId, tipo, fecha } = body;
    
    if (!empleadoId || !tipo || !fecha) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos' 
      }, { status: 400 });
    }

    // Verificar que el empleado existe y está activo
    const empleado = await db.empleado.findUnique({
      where: { id: empleadoId }
    });

    if (!empleado) {
      return NextResponse.json({ 
        error: 'Empleado no encontrado' 
      }, { status: 404 });
    }

    if (!empleado.activo) {
      return NextResponse.json({ 
        error: 'El empleado no está activo' 
      }, { status: 400 });
    }

    const now = new Date();
    const hora = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Obtener configuración de la empresa
    let config: any = null;
    try {
      config = await db.empresa.findUnique({ where: { id: 'default' } });
    } catch (e) {
      config = { horaEntrada: '09:00', toleranciaMinutos: 15 };
    }
    
    // ========== SEGURIDAD ANTI-DUPLICADOS ==========
    
    // 1. Verificar si ya existe un registro del mismo tipo HOY
    const existenteHoy = await db.registro.findFirst({
      where: { empleadoId, fecha, tipo }
    });
    
    if (existenteHoy) {
      const tiempoTranscurrido = Math.floor((now.getTime() - new Date(existenteHoy.timestamp).getTime()) / 1000 / 60);
      return NextResponse.json({ 
        error: `⚠️ Ya registraste ${tipo.toLowerCase()} hoy a las ${existenteHoy.hora}`,
        detalle: `Intento duplicado bloqueado. Último registro hace ${tiempoTranscurrido} minutos.`,
        registro: existenteHoy 
      }, { status: 400 });
    }

    // 2. Verificar coherencia de entrada/salida
    // No permitir salida sin entrada previa
    if (tipo === 'SALIDA') {
      const entradaHoy = await db.registro.findFirst({
        where: { empleadoId, fecha, tipo: 'ENTRADA' }
      });
      
      if (!entradaHoy) {
        return NextResponse.json({ 
          error: '⚠️ Debes registrar tu entrada antes de marcar la salida',
          detalle: 'No hay registro de entrada para hoy'
        }, { status: 400 });
      }
    }

    // 3. No permitir entrada doble (verificación adicional con unique constraint)
    const ultimaEntrada = await db.registro.findFirst({
      where: { empleadoId, tipo: 'ENTRADA' },
      orderBy: { timestamp: 'desc' }
    });

    const ultimaSalida = await db.registro.findFirst({
      where: { empleadoId, tipo: 'SALIDA' },
      orderBy: { timestamp: 'desc' }
    });

    // Si intenta marcar entrada y la última marca fue entrada sin salida
    if (tipo === 'ENTRADA' && ultimaEntrada && ultimaSalida) {
      if (new Date(ultimaEntrada.timestamp) > new Date(ultimaSalida.timestamp)) {
        return NextResponse.json({ 
          error: '⚠️ Ya tienes una entrada activa sin registrar salida',
          detalle: `Última entrada: ${ultimaEntrada.fecha} a las ${ultimaEntrada.hora}`
        }, { status: 400 });
      }
    }
    
    // Determinar estado (temprano, tarde, normal)
    let estado = 'normal';
    let minutosRetraso = 0;
    
    if (tipo === 'ENTRADA' && config) {
      const [horaEntr, minEntr] = config.horaEntrada.split(':').map(Number);
      const [horaActual, minActual] = hora.split(':').map(Number);
      
      const minutosEntrada = horaEntr * 60 + minEntr + (config.toleranciaMinutos || 15);
      const minutosActual = horaActual * 60 + minActual;
      
      if (minutosActual > minutosEntrada) {
        estado = 'tarde';
        minutosRetraso = minutosActual - minutosEntrada;
      } else if (minutosActual < horaEntr * 60 + minEntr) {
        estado = 'temprano';
      }
    }
    
    const registro = await db.registro.create({
      data: {
        empleadoId,
        tipo,
        fecha,
        hora,
        estado,
        minutosRetraso,
        timestamp: now.toISOString()
      }
    });
    
    // Si llegó tarde, crear notificación
    if (estado === 'tarde') {
      const empleado = await db.empleado.findUnique({ where: { id: empleadoId } });
      
      await db.notificacion.create({
        data: {
          tipo: 'EMAIL',
          destino: config?.emailAdmin || 'admin@empresa.com',
          asunto: `${empleado?.nombre} ${empleado?.apellido} llegó tarde`,
          mensaje: `El empleado ${empleado?.nombre} ${empleado?.apellido} llegó ${minutosRetraso} minutos tarde a las ${hora}`,
          enviado: false
        }
      });
    }
    
    // Calcular horas trabajadas si es salida
    if (tipo === 'SALIDA') {
      const entrada = await db.registro.findFirst({
        where: { empleadoId, fecha, tipo: 'ENTRADA' }
      });
      
      if (entrada) {
        const [h1, m1] = entrada.hora.split(':').map(Number);
        const [h2, m2] = hora.split(':').map(Number);
        const horas = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
        
        await db.registro.update({
          where: { id: registro.id },
          data: { horasTrabajadas: horas }
        });
      }
    }
    
    const registroCompleto = await db.registro.findUnique({
      where: { id: registro.id },
      include: { empleado: true }
    });
    
    return NextResponse.json({ success: true, registro: registroCompleto });
  } catch (error) {
    console.error('Error creando registro:', error);
    return NextResponse.json({ error: 'Error al registrar' }, { status: 500 });
  }
}
