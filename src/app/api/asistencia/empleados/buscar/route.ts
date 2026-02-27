import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qr = searchParams.get('qr');
    
    if (!qr) {
      return NextResponse.json({ error: 'Código QR requerido' }, { status: 400 });
    }

    const empleado = await db.empleado.findFirst({
      where: { 
        qrCodigo: qr,
        activo: true 
      }
    });
    
    if (!empleado) {
      return NextResponse.json({ empleado: null });
    }
    
    return NextResponse.json({ empleado });
  } catch (error) {
    console.error('Error buscando empleado:', error);
    return NextResponse.json({ empleado: null });
  }
}
