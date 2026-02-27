import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Exportar productos a CSV
export async function GET(request: NextRequest) {
  try {
    const productos = await db.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });

    const headers = ['Código', 'Nombre', 'Descripción', 'Categoría', 'Stock', 'Stock Mínimo', 
                     'Precio Compra', 'Precio Venta', '% Ganancia', 'Ganancia $', 'Proveedor', 'Ubicación'];
    
    let csv = headers.join(',') + '\n';
    
    productos.forEach(p => {
      csv += [
        `"${p.codigo}"`,
        `"${p.nombre}"`,
        `"${p.descripcion || ''}"`,
        `"${p.categoria}"`,
        p.stock,
        p.stockMinimo,
        p.precioCompra,
        p.precioVenta,
        p.gananciaPorcentaje,
        p.gananciaMonto,
        `"${p.proveedor || ''}"`,
        `"${p.ubicacion || ''}"`
      ].join(',') + '\n';
    });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="productos_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error al exportar productos:', error);
    return NextResponse.json({ error: 'Error al exportar productos' }, { status: 500 });
  }
}

// POST - Importar productos desde CSV
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { productos } = data;
    
    if (!Array.isArray(productos)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
    }

    let importados = 0;
    let errores = 0;

    for (const p of productos) {
      try {
        // Generar código si no existe
        let codigo = p.codigo || p['Código'] || p['Codigo'];
        if (!codigo) {
          const prefijo = (p.nombre || p['Nombre'] || 'PROD').substring(0, 3).toUpperCase();
          const numero = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          codigo = `${prefijo}-${numero}`;
        }

        // Verificar si ya existe
        const existente = await db.producto.findFirst({
          where: { 
            OR: [
              { codigo },
              { nombre: p.nombre || p['Nombre'] }
            ]
          }
        });

        const precioCompra = parseFloat(p.precioCompra || p['Precio Compra'] || p['PrecioCompra'] || 0);
        const gananciaPorcentaje = parseInt(p.gananciaPorcentaje || p['% Ganancia'] || p['Ganancia %'] || 30);
        const precioVenta = precioCompra * (1 + gananciaPorcentaje / 100);
        const gananciaMonto = precioVenta - precioCompra;

        if (existente) {
          // Actualizar existente
          await db.producto.update({
            where: { id: existente.id },
            data: {
              nombre: p.nombre || p['Nombre'] || existente.nombre,
              descripcion: p.descripcion || p['Descripción'] || p['Descripcion'] || existente.descripcion,
              categoria: p.categoria || p['Categoría'] || p['Categoria'] || existente.categoria,
              stock: parseInt(p.stock || p['Stock']) ?? existente.stock,
              stockMinimo: parseInt(p.stockMinimo || p['Stock Mínimo'] || p['StockMinimo']) ?? existente.stockMinimo,
              precioCompra,
              precioVenta,
              gananciaPorcentaje,
              gananciaMonto,
              proveedor: p.proveedor || p['Proveedor'] || existente.proveedor,
              ubicacion: p.ubicacion || p['Ubicación'] || existente.ubicacion
            }
          });
        } else {
          // Crear nuevo
          await db.producto.create({
            data: {
              codigo,
              nombre: p.nombre || p['Nombre'] || 'Sin nombre',
              descripcion: p.descripcion || p['Descripción'] || p['Descripcion'] || null,
              categoria: p.categoria || p['Categoría'] || p['Categoria'] || 'General',
              stock: parseInt(p.stock || p['Stock']) || 0,
              stockMinimo: parseInt(p.stockMinimo || p['Stock Mínimo'] || p['StockMinimo']) || 5,
              precioCompra,
              precioVenta,
              gananciaPorcentaje,
              gananciaMonto,
              proveedor: p.proveedor || p['Proveedor'] || null,
              ubicacion: p.ubicacion || p['Ubicación'] || null
            }
          });
        }
        importados++;
      } catch (e) {
        errores++;
        console.error('Error importando producto:', e);
      }
    }

    return NextResponse.json({ 
      success: true, 
      importados,
      errores,
      mensaje: `Se importaron ${importados} productos. ${errores > 0 ? `${errores} con errores.` : ''}`
    });
  } catch (error) {
    console.error('Error al importar productos:', error);
    return NextResponse.json({ error: 'Error al importar productos' }, { status: 500 });
  }
}
