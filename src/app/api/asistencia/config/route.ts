import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener configuración
export async function GET() {
  try {
    let config = await db.empresa.findUnique({ where: { id: 'default' } });
    
    if (!config) {
      // Crear configuración por defecto
      config = await db.empresa.create({
        data: {
          id: 'default',
          nombre: 'Mi Empresa',
          horaEntrada: '09:00',
          horaSalida: '18:00',
          toleranciaMinutos: 15,
          notifEmail: true,
          notifTelegram: false,
          notifWhatsapp: false,
        }
      });
    }
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      nombre: 'Mi Empresa',
      horaEntrada: '09:00',
      horaSalida: '18:00',
      toleranciaMinutos: 15
    });
  }
}

// POST - Guardar configuración
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const config = await db.empresa.upsert({
      where: { id: 'default' },
      update: {
        nombre: body.nombre,
        horaEntrada: body.horaEntrada,
        horaSalida: body.horaSalida,
        toleranciaMinutos: body.toleranciaMinutos,
        emailAdmin: body.emailAdmin,
        updatedAt: new Date().toISOString()
      },
      create: {
        id: 'default',
        nombre: body.nombre,
        horaEntrada: body.horaEntrada,
        horaSalida: body.horaSalida,
        toleranciaMinutos: body.toleranciaMinutos,
        emailAdmin: body.emailAdmin,
      }
    });
    
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error guardando configuración:', error);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}
