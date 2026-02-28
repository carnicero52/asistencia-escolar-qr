import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - Listar proveedores
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const buscar = searchParams.get('buscar') || ''
    
    const proveedores = await prisma.proveedorPOS.findMany({
      where: {
        OR: [
          { nombre: { contains: buscar, mode: 'insensitive' } },
          { contacto: { contains: buscar, mode: 'insensitive' } },
        ],
        activo: true,
      },
      orderBy: { nombre: 'asc' },
    })
    
    return NextResponse.json(proveedores)
  } catch (error) {
    console.error('Error al obtener proveedores:', error)
    return NextResponse.json({ error: 'Error al obtener proveedores' }, { status: 500 })
  }
}

// POST - Crear proveedor
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const proveedor = await prisma.proveedorPOS.create({
      data: {
        nombre: data.nombre,
        contacto: data.contacto || null,
        email: data.email || null,
        telefono: data.telefono || null,
        direccion: data.direccion || null,
        productos: data.productos || null,
        notas: data.notas || null,
      },
    })
    
    return NextResponse.json(proveedor)
  } catch (error) {
    console.error('Error al crear proveedor:', error)
    return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 })
  }
}
