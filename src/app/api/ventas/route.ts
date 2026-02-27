import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener todas las ventas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const estado = searchParams.get('estado');

    let where: any = {};

    if (desde) {
      where.createdAt = { ...where.createdAt, gte: new Date(desde) };
    }
    if (hasta) {
      where.createdAt = { ...where.createdAt, lte: new Date(hasta) };
    }
    if (estado && estado !== 'todas') {
      where.estado = estado;
    }

    const ventas = await db.venta.findMany({
      where,
      include: {
        detalles: {
          include: {
            producto: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(ventas);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 });
  }
}

// POST - Crear nueva venta
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Generar número de venta
    const ultimaVenta = await db.venta.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    const numeroVenta = ultimaVenta 
      ? `V-${(parseInt(ultimaVenta.numeroVenta.split('-')[1]) + 1).toString().padStart(6, '0')}`
      : 'V-000001';

    // Calcular totales
    let subtotal = 0;
    let gananciaTotal = 0;

    const detalles = await Promise.all(data.detalles.map(async (d: any) => {
      const producto = await db.producto.findUnique({ where: { id: d.productoId } });
      if (!producto) throw new Error(`Producto ${d.productoId} no encontrado`);
      
      const precioUnitario = parseFloat(d.precioUnitario) || producto.precioVenta;
      const cantidad = parseInt(d.cantidad);
      const subtotalDetalle = precioUnitario * cantidad;
      const ganancia = (precioUnitario - producto.precioCompra) * cantidad;

      subtotal += subtotalDetalle;
      gananciaTotal += ganancia;

      return {
        productoId: d.productoId,
        cantidad,
        precioUnitario,
        precioCompra: producto.precioCompra,
        ganancia,
        subtotal: subtotalDetalle
      };
    }));

    const impuestos = parseFloat(data.impuestos) || 0;
    const descuento = parseFloat(data.descuento) || 0;
    const total = subtotal + impuestos - descuento;

    // Crear la venta
    const venta = await db.venta.create({
      data: {
        numeroVenta,
        cliente: data.cliente || null,
        clienteEmail: data.clienteEmail || null,
        clienteTelefono: data.clienteTelefono || null,
        subtotal,
        impuestos,
        descuento,
        total,
        gananciaTotal,
        metodoPago: data.metodoPago || 'Efectivo',
        estado: data.estado || 'Completada',
        observaciones: data.observaciones || null,
        usuario: data.usuario || null,
        detalles: {
          create: detalles
        }
      },
      include: {
        detalles: {
          include: {
            producto: true
          }
        }
      }
    });

    // Actualizar stock y crear movimientos
    for (const detalle of venta.detalles) {
      const producto = await db.producto.findUnique({ where: { id: detalle.productoId } });
      if (producto) {
        const stockAnterior = producto.stock;
        const stockNuevo = stockAnterior - detalle.cantidad;

        await db.producto.update({
          where: { id: detalle.productoId },
          data: { stock: stockNuevo }
        });

        await db.movimiento.create({
          data: {
            tipo: 'SALIDA',
            productoId: detalle.productoId,
            cantidad: detalle.cantidad,
            stockAnterior,
            stockNuevo,
            precioUnitario: detalle.precioUnitario,
            total: detalle.subtotal,
            motivo: `Venta ${numeroVenta}`,
            usuario: data.usuario || null
          }
        });

        // Crear alerta si stock bajo
        if (stockNuevo <= producto.stockMinimo) {
          await db.alerta.create({
            data: {
              tipo: stockNuevo === 0 ? 'SIN_STOCK' : 'STOCK_BAJO',
              productoId: producto.id,
              mensaje: `Producto "${producto.nombre}" tiene stock ${stockNuevo === 0 ? 'agotado' : 'bajo'} (${stockNuevo} unidades)`
            }
          });
        }
      }
    }

    return NextResponse.json(venta);
  } catch (error) {
    console.error('Error al crear venta:', error);
    return NextResponse.json({ error: 'Error al crear venta' }, { status: 500 });
  }
}

// PUT - Actualizar estado de venta
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    const venta = await db.venta.update({
      where: { id: data.id },
      data: {
        estado: data.estado
      }
    });

    return NextResponse.json(venta);
  } catch (error) {
    console.error('Error al actualizar venta:', error);
    return NextResponse.json({ error: 'Error al actualizar venta' }, { status: 500 });
  }
}
