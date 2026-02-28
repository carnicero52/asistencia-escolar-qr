import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - Obtener configuración
export async function GET() {
  try {
    let config = await prisma.configPOS.findUnique({
      where: { id: 'default' },
    })
    
    if (!config) {
      config = await prisma.configPOS.create({
        data: { id: 'default' },
      })
    }
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

// PUT - Actualizar configuración
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    
    const config = await prisma.configPOS.upsert({
      where: { id: 'default' },
      update: {
        nombreNegocio: data.nombreNegocio,
        moneda: data.moneda,
        impuesto: data.impuesto,
        direccion: data.direccion || null,
        telefono: data.telefono || null,
        email: data.email || null,
      },
      create: {
        id: 'default',
        nombreNegocio: data.nombreNegocio || 'Mi Negocio',
        moneda: data.moneda || '$',
        impuesto: data.impuesto || 16,
      },
    })
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error al actualizar configuración:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}
