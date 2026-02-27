import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener todas las compras
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

    const compras = await db.compra.findMany({
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

    return NextResponse.json(compras);
  } catch (error) {
    console.error('Error al obtener compras:', error);
    return NextResponse.json({ error: 'Error al obtener compras' }, { status: 500 });
  }
}

// POST - Crear nueva compra
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Generar número de compra
    const ultimaCompra = await db.compra.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    const numeroCompra = ultimaCompra 
      ? `C-${(parseInt(ultimaCompra.numeroCompra.split('-')[1]) + 1).toString().padStart(6, '0')}`
      : 'C-000001';

    // Calcular totales y procesar detalles
    let subtotal = 0;

    const detalles = await Promise.all(data.detalles.map(async (d: any) => {
      const producto = await db.producto.findUnique({ where: { id: d.productoId } });
      if (!producto) throw new Error(`Producto ${d.productoId} no encontrado`);
      
      const precioUnitario = parseFloat(d.precioUnitario) || producto.precioCompra;
      const cantidad = parseInt(d.cantidad);
      const subtotalDetalle = precioUnitario * cantidad;

      subtotal += subtotalDetalle;

      return {
        productoId: d.productoId,
        cantidad,
        precioUnitario,
        subtotal: subtotalDetalle
      };
    }));

    const impuestos = parseFloat(data.impuestos) || 0;
    const total = subtotal + impuestos;

    // Crear la compra
    const compra = await db.compra.create({
      data: {
        numeroCompra,
        proveedor: data.proveedor || null,
        proveedorRuc: data.proveedorRuc || null,
        proveedorEmail: data.proveedorEmail || null,
        proveedorTelefono: data.proveedorTelefono || null,
        subtotal,
        impuestos,
        total,
        estado: data.estado || 'Recibida',
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
    for (const detalle of compra.detalles) {
      const producto = await db.producto.findUnique({ where: { id: detalle.productoId } });
      if (producto) {
        const stockAnterior = producto.stock;
        const stockNuevo = stockAnterior + detalle.cantidad;

        // Actualizar precio de compra si es diferente
        const updateData: any = { stock: stockNuevo };
        if (detalle.precioUnitario !== producto.precioCompra) {
          const gananciaMonto = producto.precioVenta - detalle.precioUnitario;
          updateData.precioCompra = detalle.precioUnitario;
          updateData.gananciaMonto = gananciaMonto;
        }

        await db.producto.update({
          where: { id: detalle.productoId },
          data: updateData
        });

        await db.movimiento.create({
          data: {
            tipo: 'ENTRADA',
            productoId: detalle.productoId,
            cantidad: detalle.cantidad,
            stockAnterior,
            stockNuevo,
            precioUnitario: detalle.precioUnitario,
            total: detalle.subtotal,
            motivo: `Compra ${numeroCompra}`,
            usuario: data.usuario || null
          }
        });
      }
    }

    return NextResponse.json(compra);
  } catch (error) {
    console.error('Error al crear compra:', error);
    return NextResponse.json({ error: 'Error al crear compra' }, { status: 500 });
  }
}
