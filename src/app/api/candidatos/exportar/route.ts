import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db-libsql';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getDb();

    const sesionResult = await db.execute({
      sql: 'SELECT * FROM Sesion WHERE token = ?',
      args: [token]
    });

    if (sesionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    }

    const sesion = sesionResult.rows[0];
    
    // Obtener negocio para el slug
    const negocioResult = await db.execute({
      sql: 'SELECT slug FROM Negocio WHERE id = ?',
      args: [sesion.negocioId as string]
    });
    
    const slug = negocioResult.rows[0]?.slug || 'export';

    // Obtener candidatos
    const candidatos = await db.execute({
      sql: 'SELECT * FROM Candidato WHERE negocioId = ? ORDER BY createdAt DESC',
      args: [sesion.negocioId as string]
    });

    // Crear CSV
    const headers = [
      'Nombre', 'Email', 'Teléfono', 'Dirección', 'Fecha Nacimiento',
      'Puesto Solicitado', 'Experiencia', 'Educación', 'Habilidades',
      'Disponibilidad', 'CV URL', 'Estado', 'Notas', 'Fecha Registro'
    ];

    const rows = candidatos.rows.map((c: any) => [
      c.nombre, c.email, c.telefono, c.direccion || '', c.fechaNacimiento || '',
      c.puestoSolicitado || '', c.experiencia || '', c.educacion || '',
      c.habilidades || '', c.disponibilidad || '', c.cvUrl || '',
      c.estado, (c.notas || '').replace(/"/g, '""').replace(/\n/g, ' '),
      new Date(c.createdAt as string).toLocaleDateString('es-MX')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="candidatos-${slug}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error al exportar:', error);
    return NextResponse.json({ error: 'Error al exportar candidatos' }, { status: 500 });
  }
}
