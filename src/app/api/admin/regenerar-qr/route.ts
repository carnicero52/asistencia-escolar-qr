import { db } from '@/lib/database';
import { verifyAdminSession } from '@/lib/auth';
import { generateQRCodeDataURL } from '@/lib/qrcode';
import { NextRequest, NextResponse } from 'next/server';

// POST - Regenerar QR con nueva URL base
export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const negocioId = await verifyAdminSession(token);

  if (!negocioId) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { baseUrl } = body;

    if (!baseUrl) {
      return NextResponse.json({ error: 'URL base requerida' }, { status: 400 });
    }

    // Validar que sea una URL válida
    try {
      new URL(baseUrl);
    } catch {
      return NextResponse.json({ error: 'URL base inválida' }, { status: 400 });
    }

    // Generar nueva URL del QR
    const qrUrl = `${baseUrl.replace(/\/$/, '')}/scan?negocio=${negocioId}`;

    // Actualizar negocio
    const negocio = await db.negocio.update({
      where: { id: negocioId },
      data: { qrUrl },
      select: {
        id: true,
        nombre: true,
        qrUrl: true,
      },
    });

    // Generar QR como data URL
    const qrDataURL = await generateQRCodeDataURL(qrUrl);

    return NextResponse.json({
      success: true,
      negocio,
      qrDataURL,
    });
  } catch (error) {
    console.error('Error regenerando QR:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
