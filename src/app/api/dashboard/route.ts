import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Obtener todos los productos activos
    const productos = await db.producto.findMany({
      where: { activo: true }
    });

    // Estadísticas de productos
    const totalProductos = productos.length;
    const productosStockBajo = productos.filter(p => p.stock > 0 && p.stock <= p.stockMinimo).length;
    const productosSinStock = productos.filter(p => p.stock === 0).length;

    // Valor del inventario
    const valorInventario = productos.reduce((sum, p) => sum + (p.precioCompra * p.stock), 0);
    const valorVenta = productos.reduce((sum, p) => sum + (p.precioVenta * p.stock), 0);
    const gananciaPotencial = valorVenta - valorInventario;

    // Ventas del mes
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const ventasMes = await db.venta.findMany({
      where: {
        createdAt: { gte: inicioMes },
        estado: 'Completada'
      },
      include: {
        detalles: true
      }
    });

    const totalVentasMes = ventasMes.reduce((sum, v) => sum + v.total, 0);
    const gananciaVentasMes = ventasMes.reduce((sum, v) => sum + v.gananciaTotal, 0);
    const cantidadVentasMes = ventasMes.length;

    // Compras del mes
    const comprasMes = await db.compra.findMany({
      where: {
        createdAt: { gte: inicioMes }
      }
    });

    const totalComprasMes = comprasMes.reduce((sum, c) => sum + c.total, 0);

    // Ventas de hoy
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const ventasHoy = await db.venta.findMany({
      where: {
        createdAt: { gte: inicioHoy },
        estado: 'Completada'
      }
    });

    const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);

    // Productos más vendidos (último mes)
    const detallesVenta = await db.detalleVenta.findMany({
      where: {
        venta: {
          createdAt: { gte: inicioMes },
          estado: 'Completada'
        }
      },
      include: {
        producto: true
      }
    });

    const ventasPorProducto: Record<string, { nombre: string; cantidad: number; total: number }> = {};
    detallesVenta.forEach(d => {
      if (!ventasPorProducto[d.productoId]) {
        ventasPorProducto[d.productoId] = {
          nombre: d.producto.nombre,
          cantidad: 0,
          total: 0
        };
      }
      ventasPorProducto[d.productoId].cantidad += d.cantidad;
      ventasPorProducto[d.productoId].total += d.subtotal;
    });

    const productosMasVendidos = Object.values(ventasPorProducto)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // Productos por categoría
    const categorias: Record<string, { cantidad: number; valor: number }> = {};
    productos.forEach(p => {
      const cat = p.categoria || 'Sin categoría';
      if (!categorias[cat]) {
        categorias[cat] = { cantidad: 0, valor: 0 };
      }
      categorias[cat].cantidad++;
      categorias[cat].valor += p.precioCompra * p.stock;
    });

    // Últimas ventas
    const ultimasVentas = await db.venta.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        detalles: {
          include: {
            producto: true
          }
        }
      }
    });

    // Alertas de stock
    const alertas = await db.alerta.findMany({
      where: { leida: false },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Movimientos recientes
    const movimientosRecientes = await db.movimiento.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        producto: true
      }
    });

    return NextResponse.json({
      totalProductos,
      productosStockBajo,
      productosSinStock,
      valorInventario,
      valorVenta,
      gananciaPotencial,
      ventas: {
        mes: {
          cantidad: cantidadVentasMes,
          total: totalVentasMes,
          ganancia: gananciaVentasMes
        },
        hoy: {
          cantidad: ventasHoy.length,
          total: totalVentasHoy
        }
      },
      compras: {
        mes: {
          cantidad: comprasMes.length,
          total: totalComprasMes
        }
      },
      productosMasVendidos,
      categorias,
      ultimasVentas,
      alertas,
      movimientosRecientes
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
