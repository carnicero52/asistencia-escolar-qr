import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET - Listar empleados
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      const empleado = await db.empleado.findUnique({ where: { id } });
      return NextResponse.json(empleado);
    }
    
    const empleados = await db.empleado.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
    
    return NextResponse.json(empleados);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST - Crear empleado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo, nombre, apellido, email, telefono, puesto, departamento } = body;
    
    // Generar código QR único
    const qrCodigo = `QR-${nanoid(8).toUpperCase()}`;
    
    const empleado = await db.empleado.create({
      data: {
        codigo,
        nombre,
        apellido,
        email,
        telefono,
        puesto,
        departamento,
        qrCodigo,
        activo: true,
      }
    });
    
    return NextResponse.json({ success: true, empleado });
  } catch (error) {
    console.error('Error creando empleado:', error);
    return NextResponse.json({ error: 'Error al crear empleado' }, { status: 500 });
  }
}

// PUT - Actualizar empleado
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, codigo, nombre, apellido, email, telefono, puesto, departamento } = body;
    
    const empleado = await db.empleado.update({
      where: { id },
      data: {
        codigo,
        nombre,
        apellido,
        email,
        telefono,
        puesto,
        departamento,
        updatedAt: new Date().toISOString()
      }
    });
    
    return NextResponse.json({ success: true, empleado });
  } catch (error) {
    console.error('Error actualizando empleado:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

// DELETE - Eliminar empleado
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }
    
    await db.empleado.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error eliminando empleado:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
