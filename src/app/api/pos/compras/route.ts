import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - Listar compras
export async function GET(request: NextRequest) {
  try {
    const compras = await prisma.compraPOS.findMany({
      include: { detalles: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    
    return NextResponse.json(compras)
  } catch (error) {
    console.error('Error al obtener compras:', error)
    return NextResponse.json({ error: 'Error al obtener compras' }, { status: 500 })
  }
}

// POST - Crear compra
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Generar número de compra
    const ultimaCompra = await prisma.compraPOS.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { numeroCompra: true },
    })
    
    const numeroCompra = ultimaCompra 
      ? `C-${(parseInt(ultimaCompra.numeroCompra.replace('C-', '')) + 1).toString().padStart(6, '0')}`
      : 'C-000001'
    
    const compra = await prisma.compraPOS.create({
      data: {
        numeroCompra,
        proveedorId: data.proveedorId || null,
        proveedorNombre: data.proveedorNombre || null,
        subtotal: data.subtotal || 0,
        impuestos: data.impuestos || 0,
        total: data.total || 0,
        estado: data.estado || 'Pendiente',
        detalles: {
          create: data.detalles?.map((d: any) => ({
            productoId: d.productoId || null,
            productoNombre: d.productoNombre,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            subtotal: d.subtotal,
          })) || [],
        },
      },
      include: { detalles: true },
    })
    
    // Actualizar stock de productos
    if (data.detalles) {
      for (const detalle of data.detalles) {
        if (detalle.productoId) {
          await prisma.productoPOS.update({
            where: { id: detalle.productoId },
            data: { stock: { increment: detalle.cantidad } },
          })
        }
      }
    }
    
    return NextResponse.json(compra)
  } catch (error) {
    console.error('Error al crear compra:', error)
    return NextResponse.json({ error: 'Error al crear compra' }, { status: 500 })
  }
}
