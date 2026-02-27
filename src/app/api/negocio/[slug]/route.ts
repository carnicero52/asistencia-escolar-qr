import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db-libsql';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = getDb();

    const result = await db.execute({
      sql: `SELECT id, nombre, slug, telefono, direccion, descripcion, puestoBuscado, 
            requisitos, buscandoPersonal, whatsapp, horarios, modoBot, 
            saludoBot, mensajeDespedida
            FROM Negocio WHERE slug = ?`,
      args: [slug]
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const negocio = result.rows[0];
    return NextResponse.json({ 
      negocio: {
        id: negocio.id,
        nombre: negocio.nombre,
        slug: negocio.slug,
        telefono: negocio.telefono,
        direccion: negocio.direccion,
        descripcion: negocio.descripcion,
        puestoBuscado: negocio.puestoBuscado,
        requisitos: negocio.requisitos,
        buscandoPersonal: negocio.buscandoPersonal === 1,
        whatsapp: negocio.whatsapp,
        horarios: negocio.horarios,
        modoBot: negocio.modoBot || 'hibrido',
        saludoBot: negocio.saludoBot,
        mensajeDespedida: negocio.mensajeDespedida
      }
    });
  } catch (error) {
    console.error('Error al obtener negocio:', error);
    return NextResponse.json({ error: 'Error al obtener negocio' }, { status: 500 });
  }
}
