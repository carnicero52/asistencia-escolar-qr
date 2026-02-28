import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - Listar ventas
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fecha = searchParams.get('fecha') || ''
    
    const where: any = {}
    if (fecha) {
      const fechaInicio = new Date(fecha)
      fechaInicio.setHours(0, 0, 0, 0)
      const fechaFin = new Date(fecha)
      fechaFin.setHours(23, 59, 59, 999)
      where.createdAt = { gte: fechaInicio, lte: fechaFin }
    }
    
    const ventas = await prisma.ventaPOS.findMany({
      where,
      include: {
        detalles: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    
    return NextResponse.json(ventas)
  } catch (error) {
    console.error('Error al obtener ventas:', error)
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 })
  }
}

// POST - Crear venta
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Generar número de venta
    const ultimaVenta = await prisma.ventaPOS.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { numeroVenta: true },
    })
    
    const numeroVenta = ultimaVenta 
      ? `V-${(parseInt(ultimaVenta.numeroVenta.replace('V-', '')) + 1).toString().padStart(6, '0')}`
      : 'V-000001'
    
    const venta = await prisma.ventaPOS.create({
      data: {
        numeroVenta,
        clienteId: data.clienteId || null,
        clienteNombre: data.clienteNombre || null,
        subtotal: data.subtotal || 0,
        impuestos: data.impuestos || 0,
        descuento: data.descuento || 0,
        total: data.total || 0,
        metodoPago: data.metodoPago || 'Efectivo',
        estado: 'Completada',
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
            data: { stock: { decrement: detalle.cantidad } },
          })
        }
      }
    }
    
    // Actualizar cliente si existe
    if (data.clienteId) {
      await prisma.clientePOS.update({
        where: { id: data.clienteId },
        data: {
          comprasTotal: { increment: 1 },
          ultimaCompra: new Date(),
        },
      })
    }
    
    return NextResponse.json(venta)
  } catch (error) {
    console.error('Error al crear venta:', error)
    return NextResponse.json({ error: 'Error al crear venta' }, { status: 500 })
  }
}
