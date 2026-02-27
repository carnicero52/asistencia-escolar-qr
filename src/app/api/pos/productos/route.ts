import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Listar productos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where: any = { activo: true };
    
    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { codigo: { contains: search } },
        { categoria: { contains: search } }
      ];
    }

    const productos = await db.productoPOS.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(productos);
  } catch (error) {
    console.error('Error listando productos:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST - Crear producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo, nombre, descripcion, categoria, stock, stockMinimo, precioCompra, precioVenta, proveedor } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Generar código si no existe
    const codigoFinal = codigo || `SKU-${Date.now().toString(36).toUpperCase()}`;

    // Verificar si ya existe el código
    const existente = await db.productoPOS.findUnique({
      where: { codigo: codigoFinal }
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un producto con este código' },
        { status: 400 }
      );
    }

    const producto = await db.productoPOS.create({
      data: {
        codigo: codigoFinal,
        nombre,
        descripcion: descripcion || null,
        categoria: categoria || 'General',
        stock: stock || 0,
        stockMinimo: stockMinimo || 5,
        precioCompra: precioCompra || 0,
        precioVenta: precioVenta || 0,
        proveedor: proveedor || null,
      }
    });

    return NextResponse.json({
      success: true,
      producto
    });
  } catch (error) {
    console.error('Error creando producto:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
