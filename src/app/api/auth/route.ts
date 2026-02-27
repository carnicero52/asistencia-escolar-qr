import { db } from '@/lib/database';
import { verifyPassword, createAdminSession, verifyAdminSession, deleteAdminSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// POST - Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar negocio por email
    const negocio = await db.negocio.findFirst({
      where: { emailDestino: email },
    });

    if (!negocio) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      );
    }

    // Verificar contraseña
    if (!verifyPassword(password, negocio.password)) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      );
    }

    // Crear sesión
    const token = await createAdminSession(negocio.id);

    const response = NextResponse.json({
      success: true,
      negocio: {
        id: negocio.id,
        nombre: negocio.nombre,
        slug: negocio.slug,
        emailDestino: negocio.emailDestino,
        telefono: negocio.telefono,
        direccion: negocio.direccion,
        descripcion: negocio.descripcion,
        logoUrl: negocio.logoUrl,
        telegramToken: negocio.telegramToken,
        telegramChatId: negocio.telegramChatId,
        telegramActivo: negocio.telegramActivo,
        qrUrl: negocio.qrUrl,
      },
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// GET - Verificar sesión
export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const negocioId = await verifyAdminSession(token);

  if (!negocioId) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    response.cookies.delete('admin_token');
    return response;
  }

  const negocio = await db.negocio.findUnique({
    where: { id: negocioId },
    select: {
      id: true,
      nombre: true,
      slug: true,
      emailDestino: true,
      telefono: true,
      direccion: true,
      descripcion: true,
      logoUrl: true,
      telegramToken: true,
      telegramChatId: true,
      telegramActivo: true,
      qrUrl: true,
    },
  });

  return NextResponse.json({ authenticated: true, negocio });
}

// DELETE - Logout
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;

  if (token) {
    await deleteAdminSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_token');
  return response;
}
