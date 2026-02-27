import { db } from '@/lib/database';
import crypto from 'crypto';

// Hash password simple con SHA256
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Verificar password
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Generar token de sesión
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Crear sesión
export async function createAdminSession(negocioId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

  await db.sesion.create({
    data: {
      negocioId,
      token,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return token;
}

// Verificar sesión
export async function verifyAdminSession(token: string): Promise<string | null> {
  const session = await db.sesion.findUnique({
    where: { token },
  });

  if (!session) return null;
  if (new Date(session.expiresAt as string) < new Date()) {
    await db.sesion.delete({ where: { token } });
    return null;
  }

  return session.negocioId as string;
}

// Eliminar sesión
export async function deleteAdminSession(token: string): Promise<void> {
  try {
    await db.sesion.delete({ where: { token } });
  } catch {
    // Ignorar si no existe
  }
}
