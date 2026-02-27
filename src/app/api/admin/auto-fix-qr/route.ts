import { db } from '@/lib/database';
import { verifyAdminSession } from '@/lib/auth';
import { generateQRCodeDataURL } from '@/lib/qrcode';
import { NextRequest, NextResponse } from 'next/server';

// POST - Corregir la URL del QR con la URL base proporcionada por el cliente
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
    // Leer el body para obtener la URL base que el cliente envía
    let baseUrl: string | null = null;
    
    try {
      const body = await request.json();
      baseUrl = body.baseUrl;
    } catch {
      // Si no hay body, intentar detectar desde headers
    }
    
    // Si no se recibió URL del cliente, intentar detectar desde headers
    if (!baseUrl) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
      const host = request.headers.get('host') || 'localhost:3000';
      const actualHost = forwardedHost || host;
      baseUrl = `${forwardedProto}://${actualHost}`;
    }
    
    // Validar que la URL sea válida
    try {
      new URL(baseUrl);
    } catch {
      return NextResponse.json({ error: 'URL base inválida' }, { status: 400 });
    }

    // Limpiar la URL base (remover trailing slash)
    baseUrl = baseUrl.replace(/\/$/, '');

    console.log('Auto-fix QR - Using base URL:', baseUrl);

    // Generar nueva URL del QR para la página de scan
    const qrUrl = `${baseUrl}/scan?negocio=${negocioId}`;

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

    console.log('Auto-fix QR - Updated QR URL:', qrUrl);

    return NextResponse.json({
      success: true,
      negocio,
      qrDataURL,
      usedBaseUrl: baseUrl,
    });
  } catch (error) {
    console.error('Error auto-corrigiendo QR:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
