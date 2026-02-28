import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const buscar = searchParams.get('buscar') || ''
    
    const clientes = await prisma.clientePOS.findMany({
      where: {
        OR: [
          { nombre: { contains: buscar, mode: 'insensitive' } },
          { email: { contains: buscar, mode: 'insensitive' } },
          { telefono: { contains: buscar } },
        ],
        activo: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json(clientes)
  } catch (error) {
    console.error('Error al obtener clientes:', error)
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

// POST - Crear cliente
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const cliente = await prisma.clientePOS.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono || null,
        direccion: data.direccion || null,
        rfc: data.rfc || null,
        notas: data.notas || null,
      },
    })
    
    return NextResponse.json(cliente)
  } catch (error: any) {
    console.error('Error al crear cliente:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
  }
}
