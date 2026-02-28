import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// GET - Listar estudiantes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const grupo = searchParams.get('grupo');
    const activo = searchParams.get('activo');

    const where: any = {};
    if (grupo) where.grupo = grupo;
    if (activo !== null) where.activo = activo === 'true';

    const estudiantes = await db.estudiante.findMany({
      where,
      include: {
        _count: {
          select: { asistencias: true }
        }
      },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }]
    });

    return NextResponse.json(estudiantes);
  } catch (error) {
    console.error('Error al obtener estudiantes:', error);
    return NextResponse.json({ error: 'Error al obtener estudiantes' }, { status: 500 });
  }
}

// POST - Crear estudiante
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validaciones
    if (!data.matricula || !data.nombre || !data.apellido || !data.email) {
      return NextResponse.json({ 
        error: 'Matrícula, nombre, apellido y email son requeridos' 
      }, { status: 400 });
    }

    // Verificar si ya existe
    const existente = await db.estudiante.findFirst({
      where: {
        OR: [
          { matricula: data.matricula },
          { email: data.email }
        ]
      }
    });

    if (existente) {
      return NextResponse.json({ 
        error: 'Ya existe un estudiante con esa matrícula o email' 
      }, { status: 400 });
    }

    // Generar token único para QR
    const qrToken = randomUUID();

    // Crear estudiante
    const estudiante = await db.estudiante.create({
      data: {
        matricula: data.matricula,
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        telefono: data.telefono || null,
        grupo: data.grupo || null,
        qrToken,
        activo: true
      }
    });

    return NextResponse.json(estudiante, { status: 201 });
  } catch (error) {
    console.error('Error al crear estudiante:', error);
    return NextResponse.json({ error: 'Error al crear estudiante' }, { status: 500 });
  }
}
