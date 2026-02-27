import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db-libsql';
import { cookies } from 'next/headers';

// Actualizar configuración del negocio - PATCH real que solo actualiza campos enviados
export async function PATCH(request: NextRequest) {
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
    const data = await request.json();

    // Construir query dinámico solo con los campos proporcionados
    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    // Mapeo de campos permitidos
    const fieldMappings: Record<string, (value: unknown) => { field: string; val: string | number | null }> = {
      nombre: (v) => ({ field: 'nombre', val: v ? String(v) : null }),
      telefono: (v) => ({ field: 'telefono', val: v ? String(v) : null }),
      direccion: (v) => ({ field: 'direccion', val: v ? String(v) : null }),
      descripcion: (v) => ({ field: 'descripcion', val: v ? String(v) : null }),
      puestoBuscado: (v) => ({ field: 'puestoBuscado', val: v ? String(v) : null }),
      requisitos: (v) => ({ field: 'requisitos', val: v ? String(v) : null }),
      buscandoPersonal: (v) => ({ field: 'buscandoPersonal', val: v ? 1 : 0 }),
      whatsapp: (v) => ({ field: 'whatsapp', val: v ? String(v) : null }),
      facebook: (v) => ({ field: 'facebook', val: v ? String(v) : null }),
      instagram: (v) => ({ field: 'instagram', val: v ? String(v) : null }),
      notifTelegramActivo: (v) => ({ field: 'notifTelegramActivo', val: v ? 1 : 0 }),
      notifTelegramBotToken: (v) => ({ field: 'notifTelegramBotToken', val: v ? String(v) : null }),
      notifTelegramChatId: (v) => ({ field: 'notifTelegramChatId', val: v ? String(v) : null }),
      notifEmailActivo: (v) => ({ field: 'notifEmailActivo', val: v ? 1 : 0 }),
      notifEmailSmtp: (v) => ({ field: 'notifEmailSmtp', val: v ? String(v) : null }),
      notifEmailPuerto: (v) => ({ field: 'notifEmailPuerto', val: v ? Number(v) : 587 }),
      notifEmailUsuario: (v) => ({ field: 'notifEmailUsuario', val: v ? String(v) : null }),
      notifEmailPassword: (v) => ({ field: 'notifEmailPassword', val: v ? String(v) : null }),
      notifEmailRemitente: (v) => ({ field: 'notifEmailRemitente', val: v ? String(v) : null }),
      notifWhatsappActivo: (v) => ({ field: 'notifWhatsappActivo', val: v ? 1 : 0 }),
      notifWhatsappApiUrl: (v) => ({ field: 'notifWhatsappApiUrl', val: v ? String(v) : null }),
      notifWhatsappApiKey: (v) => ({ field: 'notifWhatsappApiKey', val: v ? String(v) : null }),
      notifWhatsappNumero: (v) => ({ field: 'notifWhatsappNumero', val: v ? String(v) : null }),
      googleSheetsActivo: (v) => ({ field: 'googleSheetsActivo', val: v ? 1 : 0 }),
      googleSheetsId: (v) => ({ field: 'googleSheetsId', val: v ? String(v) : null }),
      googleSheetsApiKey: (v) => ({ field: 'googleSheetsApiKey', val: v ? String(v) : null }),
      modoBot: (v) => ({ field: 'modoBot', val: v ? String(v) : 'hibrido' }),
      iaProvider: (v) => ({ field: 'iaProvider', val: v ? String(v) : 'z-ai' }),
      iaApiKey: (v) => ({ field: 'iaApiKey', val: v ? String(v) : null }),
      iaModelo: (v) => ({ field: 'iaModelo', val: v ? String(v) : null }),
      iaTemperature: (v) => ({ field: 'iaTemperature', val: typeof v === 'number' ? v : 0.7 }),
    };

    // Procesar cada campo enviado
    for (const [key, value] of Object.entries(data)) {
      if (fieldMappings[key]) {
        const { field, val } = fieldMappings[key](value);
        updates.push(`${field} = ?`);
        args.push(val);
      }
    }

    // Si no hay campos para actualizar, retornar éxito
    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: 'No hay cambios' });
    }

    // Agregar updatedAt
    updates.push('updatedAt = ?');
    args.push(new Date().toISOString());

    // Agregar el ID del negocio
    args.push(sesion.negocioId as string);

    const sql = `UPDATE Negocio SET ${updates.join(', ')} WHERE id = ?`;

    await db.execute({
      sql,
      args
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}
