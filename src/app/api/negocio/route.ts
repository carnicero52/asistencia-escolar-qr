import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./dev.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

function generateSlug(nombre: string): string {
  const base = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  
  const random = nanoid(6);
  return `${base}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, email, password, telefono, puestoBuscado } = body;

    if (!nombre || !email || !password) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verificar si ya existe
    const existente = await db.execute({
      sql: 'SELECT id FROM Negocio WHERE email = ?',
      args: [email]
    });

    if (existente.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un negocio con ese email' },
        { status: 400 }
      );
    }

    const id = nanoid();
    const slug = generateSlug(nombre);
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO Negocio (id, nombre, slug, email, password, telefono, puestoBuscado, activo, buscandoPersonal, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
      args: [id, nombre, slug, email, hashedPassword, telefono || null, puestoBuscado || 'Personal general', now, now]
    });

    // Crear sesión
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.execute({
      sql: 'INSERT INTO Sesion (id, negocioId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)',
      args: [nanoid(), id, token, expiresAt.toISOString(), now]
    });

    const response = NextResponse.json({
      success: true,
      negocio: {
        id,
        nombre,
        slug,
        email
      }
    });

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt
    });

    return response;
  } catch (error) {
    console.error('Error al registrar negocio:', error);
    return NextResponse.json(
      { error: 'Error al registrar el negocio' },
      { status: 500 }
    );
  }
}
