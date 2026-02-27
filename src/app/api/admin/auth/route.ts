import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:/home/z/my-project/db/custom.db',
    authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
  });
}

// Verificar contraseña (soporta bcrypt y SHA256)
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Si es bcrypt
  if (hash.startsWith('$2b$') || hash.startsWith('$2a$')) {
    return bcrypt.compare(password, hash);
  }
  // Si es SHA256
  const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
  return sha256Hash === hash;
}

// Verificar sesión actual
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getDb();
    
    // Buscar sesión
    const sesionResult = await db.execute({
      sql: `SELECT s.*, n.id as n_id, n.nombre as n_nombre, n.slug as n_slug, n.email as n_email, 
            n.telefono as n_telefono, n.direccion as n_direccion, n.descripcion as n_descripcion,
            n.puestoBuscado as n_puestoBuscado, n.requisitos as n_requisitos, n.whatsapp as n_whatsapp,
            n.buscandoPersonal as n_buscandoPersonal, n.notifTelegramActivo, n.notifTelegramBotToken,
            n.notifTelegramChatId, n.notifEmailActivo, n.notifEmailSmtp, n.notifEmailPuerto,
            n.notifEmailUsuario, n.notifEmailPassword, n.notifEmailRemitente, n.notifWhatsappActivo,
            n.notifWhatsappApiUrl, n.notifWhatsappApiKey, n.notifWhatsappNumero, n.googleSheetsActivo,
            n.googleSheetsId, n.googleSheetsApiKey, n.modoBot, n.iaProvider, n.iaApiKey, n.iaModelo, n.iaTemperature
            FROM Sesion s 
            JOIN Negocio n ON s.negocioId = n.id 
            WHERE s.token = ?`,
      args: [token]
    });

    if (sesionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 401 });
    }

    const sesion = sesionResult.rows[0];
    const expiresAt = new Date(sesion.expiresAt as string);
    
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    }

    return NextResponse.json({
      negocio: {
        id: sesion.n_id,
        nombre: sesion.n_nombre,
        slug: sesion.n_slug,
        email: sesion.n_email,
        telefono: sesion.n_telefono,
        direccion: sesion.n_direccion,
        descripcion: sesion.n_descripcion,
        puestoBuscado: sesion.n_puestoBuscado,
        requisitos: sesion.n_requisitos,
        whatsapp: sesion.n_whatsapp,
        buscandoPersonal: sesion.n_buscandoPersonal === 1,
        modoBot: sesion.modoBot || 'hibrido',
        iaProvider: sesion.iaProvider || 'z-ai',
        iaApiKey: sesion.iaApiKey,
        iaModelo: sesion.iaModelo,
        iaTemperature: sesion.iaTemperature || 0.7,
        notifTelegramActivo: sesion.notifTelegramActivo === 1,
        notifTelegramBotToken: sesion.notifTelegramBotToken,
        notifTelegramChatId: sesion.notifTelegramChatId,
        notifEmailActivo: sesion.notifEmailActivo === 1,
        notifEmailSmtp: sesion.notifEmailSmtp,
        notifEmailPuerto: sesion.notifEmailPuerto,
        notifEmailUsuario: sesion.notifEmailUsuario,
        notifEmailPassword: sesion.notifEmailPassword,
        notifEmailRemitente: sesion.notifEmailRemitente,
        notifWhatsappActivo: sesion.notifWhatsappActivo === 1,
        notifWhatsappApiUrl: sesion.notifWhatsappApiUrl,
        notifWhatsappApiKey: sesion.notifWhatsappApiKey,
        notifWhatsappNumero: sesion.notifWhatsappNumero,
        googleSheetsActivo: sesion.googleSheetsActivo === 1,
        googleSheetsId: sesion.googleSheetsId,
        googleSheetsApiKey: sesion.googleSheetsApiKey,
      }
    });
  } catch (error) {
    console.error('Error en GET auth:', error);
    return NextResponse.json({ error: 'Error de autenticación' }, { status: 500 });
  }
}

// Login
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const db = getDb();

    // Buscar negocio por email
    const result = await db.execute({
      sql: 'SELECT * FROM Negocio WHERE email = ?',
      args: [email.toLowerCase()]
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const negocio = result.rows[0];
    const validPassword = await verifyPassword(password, negocio.password as string);
    
    if (!validPassword) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Crear nueva sesión
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.execute({
      sql: 'INSERT INTO Sesion (id, negocioId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)',
      args: [nanoid(), negocio.id as string, token, expiresAt.toISOString(), new Date().toISOString()]
    });

    const response = NextResponse.json({
      negocio: {
        id: negocio.id,
        nombre: negocio.nombre,
        slug: negocio.slug,
        email: negocio.email,
        telefono: negocio.telefono,
        direccion: negocio.direccion,
        descripcion: negocio.descripcion,
        puestoBuscado: negocio.puestoBuscado,
        buscandoPersonal: negocio.buscandoPersonal === 1,
        modoBot: negocio.modoBot || 'hibrido',
        iaProvider: negocio.iaProvider || 'z-ai',
        iaApiKey: negocio.iaApiKey,
        iaModelo: negocio.iaModelo,
        iaTemperature: negocio.iaTemperature || 0.7,
        notifTelegramActivo: negocio.notifTelegramActivo === 1,
        notifTelegramBotToken: negocio.notifTelegramBotToken,
        notifTelegramChatId: negocio.notifTelegramChatId,
        notifEmailActivo: negocio.notifEmailActivo === 1,
        notifEmailSmtp: negocio.notifEmailSmtp,
        notifEmailPuerto: negocio.notifEmailPuerto,
        notifEmailUsuario: negocio.notifEmailUsuario,
        notifEmailPassword: negocio.notifEmailPassword,
        notifEmailRemitente: negocio.notifEmailRemitente,
        notifWhatsappActivo: negocio.notifWhatsappActivo === 1,
        notifWhatsappApiUrl: negocio.notifWhatsappApiUrl,
        notifWhatsappApiKey: negocio.notifWhatsappApiKey,
        notifWhatsappNumero: negocio.notifWhatsappNumero,
        googleSheetsActivo: negocio.googleSheetsActivo === 1,
        googleSheetsId: negocio.googleSheetsId,
        googleSheetsApiKey: negocio.googleSheetsApiKey,
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
    console.error('Error en POST auth:', error);
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 });
  }
}

// Logout
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    
    if (token) {
      const db = getDb();
      await db.execute({
        sql: 'DELETE FROM Sesion WHERE token = ?',
        args: [token]
      }).catch(() => {});
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('session_token');
    return response;
  } catch {
    return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 });
  }
}
