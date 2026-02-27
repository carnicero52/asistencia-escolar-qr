import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Exportar ventas a CSV
export async function GET(request: NextRequest) {
  try {
    const ventas = await db.venta.findMany({
      include: {
        detalles: {
          include: {
            producto: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const headers = ['Nº Venta', 'Fecha', 'Cliente', 'Productos', 'Subtotal', 'Impuestos', 'Descuento', 'Total', 'Ganancia', 'Método Pago', 'Estado'];
    
    let csv = headers.join(',') + '\n';
    
    ventas.forEach(v => {
      const productosStr = v.detalles.map(d => `${d.producto.nombre} x${d.cantidad}`).join('; ');
      
      csv += [
        `"${v.numeroVenta}"`,
        `"${new Date(v.createdAt).toLocaleString('es-ES')}"`,
        `"${v.cliente || ''}"`,
        `"${productosStr}"`,
        v.subtotal,
        v.impuestos,
        v.descuento,
        v.total,
        v.gananciaTotal,
        `"${v.metodoPago}"`,
        `"${v.estado}"`
      ].join(',') + '\n';
    });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ventas_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error al exportar ventas:', error);
    return NextResponse.json({ error: 'Error al exportar ventas' }, { status: 500 });
  }
}
