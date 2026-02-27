import { verifyAdminSession } from '@/lib/auth';
import { generateQRCodeBuffer } from '@/lib/qrcode';
import { db } from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';

// GET - Descargar QR del negocio
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const negocioId = searchParams.get('negocioId');

  // Si hay token de admin, verificar sesión
  const token = request.cookies.get('admin_token')?.value;
  
  if (token) {
    const sessionNegocioId = await verifyAdminSession(token);
    if (!sessionNegocioId) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }
    // Usar el ID de la sesión si no se proporciona otro
    const targetId = negocioId || sessionNegocioId;
    return generateQRForNegocio(targetId);
  }

  // Si no hay token pero hay negocioId (acceso público para negocios verificados)
  if (negocioId) {
    return generateQRForNegocio(negocioId);
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}

async function generateQRForNegocio(negocioId: string) {
  const negocio = await db.negocio.findUnique({
    where: { id: negocioId },
    select: { qrUrl: true, nombre: true },
  });

  if (!negocio || !negocio.qrUrl) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
  }

  try {
    const qrBuffer = await generateQRCodeBuffer(negocio.qrUrl);

    return new NextResponse(qrBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="qr-${negocio.nombre.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png"`,
      },
    });
  } catch (error) {
    console.error('Error generando QR:', error);
    return NextResponse.json({ error: 'Error generando QR' }, { status: 500 });
  }
}
