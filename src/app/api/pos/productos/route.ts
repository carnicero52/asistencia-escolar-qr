import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - Listar productos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const buscar = searchParams.get('buscar') || ''
    const categoria = searchParams.get('categoria') || ''
    
    const productos = await prisma.productoPOS.findMany({
      where: {
        OR: [
          { nombre: { contains: buscar, mode: 'insensitive' } },
          { codigo: { contains: buscar } },
        ],
        ...(categoria && { categoria }),
        activo: true,
      },
      orderBy: { nombre: 'asc' },
    })
    
    return NextResponse.json(productos)
  } catch (error) {
    console.error('Error al obtener productos:', error)
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
  }
}

// POST - Crear producto
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Generar código si no se proporciona
    const codigo = data.codigo || `PROD-${Date.now().toString(36).toUpperCase()}`
    
    const producto = await prisma.productoPOS.create({
      data: {
        codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        categoria: data.categoria || 'General',
        stock: data.stock || 0,
        stockMinimo: data.stockMinimo || 5,
        precioCompra: data.precioCompra || 0,
        precioVenta: data.precioVenta || 0,
        proveedor: data.proveedor || null,
      },
    })
    
    return NextResponse.json(producto)
  } catch (error: any) {
    console.error('Error al crear producto:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'El código ya existe' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 })
  }
}
