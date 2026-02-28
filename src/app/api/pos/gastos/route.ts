import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - Listar gastos
export async function GET(request: NextRequest) {
  try {
    const gastos = await prisma.gastoPOS.findMany({
      orderBy: { fecha: 'desc' },
      take: 100,
    })
    
    return NextResponse.json(gastos)
  } catch (error) {
    console.error('Error al obtener gastos:', error)
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 })
  }
}

// POST - Crear gasto
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const gasto = await prisma.gastoPOS.create({
      data: {
        concepto: data.concepto,
        categoria: data.categoria || 'Operativo',
        monto: data.monto || 0,
        descripcion: data.descripcion || null,
      },
    })
    
    return NextResponse.json(gasto)
  } catch (error) {
    console.error('Error al crear gasto:', error)
    return NextResponse.json({ error: 'Error al crear gasto' }, { status: 500 })
  }
}
