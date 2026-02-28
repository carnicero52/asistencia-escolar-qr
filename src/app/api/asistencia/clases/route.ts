import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// GET - Listar clases
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dia = searchParams.get('dia');
    const activa = searchParams.get('activa');

    const where: any = {};
    if (dia) where.diaSemana = parseInt(dia);
    if (activa !== null) where.activa = activa === 'true';

    const clases = await db.clase.findMany({
      where,
      include: {
        _count: {
          select: { asistencias: true }
        }
      },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }]
    });

    // Agregar nombre del día
    const clasesConDia = clases.map(clase => ({
      ...clase,
      diaNombre: DIAS_SEMANA[clase.diaSemana]
    }));

    return NextResponse.json(clasesConDia);
  } catch (error) {
    console.error('Error al obtener clases:', error);
    return NextResponse.json({ error: 'Error al obtener clases' }, { status: 500 });
  }
}

// POST - Crear clase
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validaciones
    if (!data.nombre || !data.diaSemana || !data.horaInicio || !data.horaFin) {
      return NextResponse.json({ 
        error: 'Nombre, día, hora de inicio y hora de fin son requeridos' 
      }, { status: 400 });
    }

    // Generar código único
    const codigo = data.codigo || `CLASE-${randomUUID().substring(0, 8).toUpperCase()}`;

    // Verificar si ya existe el código
    const existente = await db.clase.findUnique({
      where: { codigo }
    });

    if (existente) {
      return NextResponse.json({ 
        error: 'Ya existe una clase con ese código' 
      }, { status: 400 });
    }

    // Crear clase
    const clase = await db.clase.create({
      data: {
        codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        profesor: data.profesor || null,
        salon: data.salon || null,
        diaSemana: parseInt(data.diaSemana),
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        toleranciaMinutos: data.toleranciaMinutos || 5,
        activa: true
      }
    });

    return NextResponse.json({
      ...clase,
      diaNombre: DIAS_SEMANA[clase.diaSemana]
    }, { status: 201 });
  } catch (error) {
    console.error('Error al crear clase:', error);
    return NextResponse.json({ error: 'Error al crear clase' }, { status: 500 });
  }
}
