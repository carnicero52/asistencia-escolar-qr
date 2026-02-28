import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - Listar usuarios
export async function GET() {
  try {
    const usuarios = await prisma.usuarioPOS.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    })
    
    return NextResponse.json(usuarios)
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

// POST - Crear usuario
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const usuario = await prisma.usuarioPOS.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password: data.password || null,
        rol: data.rol || 'vendedor',
      },
    })
    
    return NextResponse.json(usuario)
  } catch (error: any) {
    console.error('Error al crear usuario:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}
