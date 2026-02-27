import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where: any = { activo: true };
    
    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { email: { contains: search } },
        { telefono: { contains: search } }
      ];
    }

    const clientes = await db.clientePOS.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(clientes);
  } catch (error) {
    console.error('Error listando clientes:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST - Crear cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, email, telefono, direccion, rfc, notas } = body;

    if (!nombre || !email) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const existente = await db.clientePOS.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un cliente con este email' },
        { status: 400 }
      );
    }

    const cliente = await db.clientePOS.create({
      data: {
        nombre,
        email: email.toLowerCase(),
        telefono: telefono || null,
        direccion: direccion || null,
        rfc: rfc || null,
        notas: notas || null,
      }
    });

    return NextResponse.json({
      success: true,
      cliente
    });
  } catch (error) {
    console.error('Error creando cliente:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
