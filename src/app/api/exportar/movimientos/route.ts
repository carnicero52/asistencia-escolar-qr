import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Exportar movimientos a CSV
export async function GET(request: NextRequest) {
  try {
    const movimientos = await db.movimiento.findMany({
      include: {
        producto: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const headers = ['Fecha', 'Tipo', 'Código', 'Producto', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Precio Unitario', 'Total', 'Motivo'];
    
    let csv = headers.join(',') + '\n';
    
    movimientos.forEach(m => {
      csv += [
        `"${new Date(m.createdAt).toLocaleString('es-ES')}"`,
        `"${m.tipo}"`,
        `"${m.producto?.codigo || ''}"`,
        `"${m.producto?.nombre || ''}"`,
        m.cantidad,
        m.stockAnterior,
        m.stockNuevo,
        m.precioUnitario,
        m.total,
        `"${m.motivo || ''}"`
      ].join(',') + '\n';
    });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="movimientos_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error al exportar movimientos:', error);
    return NextResponse.json({ error: 'Error al exportar movimientos' }, { status: 500 });
  }
}
