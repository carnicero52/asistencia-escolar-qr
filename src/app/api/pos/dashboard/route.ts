import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - Datos del dashboard
export async function GET() {
  try {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const hoyFin = new Date()
    hoyFin.setHours(23, 59, 59, 999)
    
    // Ventas del día
    const ventasHoy = await prisma.ventaPOS.aggregate({
      where: {
        createdAt: { gte: hoy, lte: hoyFin },
      },
      _sum: { total: true },
      _count: true,
    })
    
    // Total productos
    const totalProductos = await prisma.productoPOS.count({
      where: { activo: true },
    })
    
    // Total clientes
    const totalClientes = await prisma.clientePOS.count({
      where: { activo: true },
    })
    
    // Gastos del mes
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const gastosMes = await prisma.gastoPOS.aggregate({
      where: {
        fecha: { gte: inicioMes },
      },
      _sum: { monto: true },
    })
    
    // Productos con bajo stock
    const productosBajoStock = await prisma.productoPOS.findMany({
      where: {
        activo: true,
        stock: { lte: prisma.productoPOS.fields.stockMinimo },
      },
      take: 5,
    })
    
    // Últimas ventas
    const ultimasVentas = await prisma.ventaPOS.findMany({
      include: { detalles: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    
    return NextResponse.json({
      ventasHoy: ventasHoy._sum.total || 0,
      cantidadVentasHoy: ventasHoy._count,
      totalProductos,
      totalClientes,
      gastosMes: gastosMes._sum.monto || 0,
      productosBajoStock,
      ultimasVentas,
    })
  } catch (error) {
    console.error('Error al obtener dashboard:', error)
    return NextResponse.json({ error: 'Error al obtener dashboard' }, { status: 500 })
  }
}
