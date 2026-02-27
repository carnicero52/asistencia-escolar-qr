import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener todos los productos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get('busqueda');
    const categoria = searchParams.get('categoria');
    const stockBajo = searchParams.get('stockBajo');

    let where: any = { activo: true };

    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda } },
        { codigo: { contains: busqueda } },
        { codigoBarras: { contains: busqueda } },
        { proveedor: { contains: busqueda } }
      ];
    }

    if (categoria && categoria !== 'todas') {
      where.categoria = categoria;
    }

    const productos = await db.producto.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Filtrar stock bajo si se solicita
    let resultado = productos;
    if (stockBajo === 'true') {
      resultado = productos.filter(p => p.stock <= p.stockMinimo);
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST - Crear nuevo producto
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Generar código si no se proporciona
    let codigo = data.codigo;
    if (!codigo) {
      const prefijo = data.nombre?.substring(0, 3).toUpperCase() || 'PROD';
      const numero = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      codigo = `${prefijo}-${numero}`;
    }

    // Verificar que el código no exista
    const existeCodigo = await db.producto.findUnique({ where: { codigo } });
    if (existeCodigo) {
      const numero = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      codigo = `${codigo.split('-')[0]}-${numero}`;
    }

    // Calcular precio de venta y ganancia
    const precioCompra = parseFloat(data.precioCompra) || 0;
    const gananciaPorcentaje = parseInt(data.gananciaPorcentaje) || 30;
    const precioVenta = precioCompra * (1 + gananciaPorcentaje / 100);
    const gananciaMonto = precioVenta - precioCompra;

    const producto = await db.producto.create({
      data: {
        codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        categoria: data.categoria || 'General',
        stock: parseInt(data.stock) || 0,
        stockMinimo: parseInt(data.stockMinimo) || 5,
        precioCompra,
        precioVenta,
        gananciaPorcentaje,
        gananciaMonto,
        proveedor: data.proveedor || null,
        ubicacion: data.ubicacion || null,
        codigoBarras: data.codigoBarras || null,
        imagen: data.imagen || null
      }
    });

    // Crear alerta si stock bajo
    if (producto.stock <= producto.stockMinimo) {
      await db.alerta.create({
        data: {
          tipo: producto.stock === 0 ? 'SIN_STOCK' : 'STOCK_BAJO',
          productoId: producto.id,
          mensaje: `Producto "${producto.nombre}" tiene stock ${producto.stock === 0 ? 'agotado' : 'bajo'} (${producto.stock} unidades)`
        }
      });
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error('Error al crear producto:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}

// PUT - Actualizar producto
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Calcular precio de venta y ganancia
    const precioCompra = parseFloat(data.precioCompra) || 0;
    const gananciaPorcentaje = parseInt(data.gananciaPorcentaje) || 30;
    const precioVenta = precioCompra * (1 + gananciaPorcentaje / 100);
    const gananciaMonto = precioVenta - precioCompra;

    const producto = await db.producto.update({
      where: { id: data.id },
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        categoria: data.categoria || 'General',
        stock: parseInt(data.stock) || 0,
        stockMinimo: parseInt(data.stockMinimo) || 5,
        precioCompra,
        precioVenta,
        gananciaPorcentaje,
        gananciaMonto,
        proveedor: data.proveedor || null,
        ubicacion: data.ubicacion || null,
        codigoBarras: data.codigoBarras || null,
        imagen: data.imagen || null
      }
    });

    // Crear alerta si stock bajo
    if (producto.stock <= producto.stockMinimo) {
      await db.alerta.create({
        data: {
          tipo: producto.stock === 0 ? 'SIN_STOCK' : 'STOCK_BAJO',
          productoId: producto.id,
          mensaje: `Producto "${producto.nombre}" tiene stock ${producto.stock === 0 ? 'agotado' : 'bajo'} (${producto.stock} unidades)`
        }
      });
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}

// DELETE - Eliminar producto (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await db.producto.update({
      where: { id },
      data: { activo: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
  }
}
