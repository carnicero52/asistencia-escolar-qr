import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener movimientos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const limite = parseInt(searchParams.get('limite') || '100');

    let where: any = {};

    if (tipo && tipo !== 'todos') {
      where.tipo = tipo;
    }
    if (desde) {
      where.createdAt = { ...where.createdAt, gte: new Date(desde) };
    }
    if (hasta) {
      where.createdAt = { ...where.createdAt, lte: new Date(hasta) };
    }

    const movimientos = await db.movimiento.findMany({
      where,
      include: {
        producto: true
      },
      orderBy: { createdAt: 'desc' },
      take: limite
    });

    return NextResponse.json(movimientos);
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 });
  }
}

// POST - Crear movimiento manual (ajuste de inventario)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const producto = await db.producto.findUnique({
      where: { id: data.productoId }
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const stockAnterior = producto.stock;
    let stockNuevo = stockAnterior;

    if (data.tipo === 'ENTRADA') {
      stockNuevo = stockAnterior + parseInt(data.cantidad);
    } else if (data.tipo === 'SALIDA') {
      if (stockAnterior < parseInt(data.cantidad)) {
        return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 });
      }
      stockNuevo = stockAnterior - parseInt(data.cantidad);
    } else if (data.tipo === 'AJUSTE') {
      stockNuevo = parseInt(data.cantidad);
    }

    // Actualizar stock del producto
    await db.producto.update({
      where: { id: data.productoId },
      data: { stock: stockNuevo }
    });

    // Crear movimiento
    const movimiento = await db.movimiento.create({
      data: {
        tipo: data.tipo,
        productoId: data.productoId,
        cantidad: parseInt(data.cantidad),
        stockAnterior,
        stockNuevo,
        precioUnitario: parseFloat(data.precioUnitario) || 0,
        total: parseFloat(data.total) || 0,
        motivo: data.motivo || null,
        observaciones: data.observaciones || null,
        usuario: data.usuario || null
      },
      include: {
        producto: true
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

    return NextResponse.json(movimiento);
  } catch (error) {
    console.error('Error al crear movimiento:', error);
    return NextResponse.json({ error: 'Error al crear movimiento' }, { status: 500 });
  }
}
