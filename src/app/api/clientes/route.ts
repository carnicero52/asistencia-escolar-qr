import { createClient } from '@libsql/client';
import { NextRequest, NextResponse } from 'next/server';
import { notifyNewClienteToOwner } from '@/lib/notifications';
import { telegramNotifyNewCliente } from '@/lib/telegram';

// Cliente directo a Turso
function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:/home/z/my-project/db/custom.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN
  });
}

// GET - Listar clientes de un negocio
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const negocioId = searchParams.get('negocioId');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  if (!negocioId) {
    return NextResponse.json({ error: 'ID de negocio requerido' }, { status: 400 });
  }

  try {
    const db = getDb();
    
    // Query principal con búsqueda opcional
    let sql = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM Compra WHERE clienteId = c.id) as comprasCount,
        (SELECT fecha FROM Compra WHERE clienteId = c.id ORDER BY fecha DESC LIMIT 1) as ultimaCompra
      FROM Cliente c
      WHERE c.negocioId = ? AND c.activo = 1
    `;
    const params: any[] = [negocioId];
    
    if (search) {
      sql += ` AND (c.nombre LIKE ? OR c.email LIKE ? OR c.telefono LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Contar total
    let countSql = `SELECT COUNT(*) as total FROM Cliente WHERE negocioId = ? AND activo = 1`;
    const countParams: any[] = [negocioId];
    if (search) {
      countSql += ` AND (nombre LIKE ? OR email LIKE ? OR telefono LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const countResult = await db.execute({ sql: countSql, args: countParams });
    const total = Number((countResult.rows[0] as any)?.total || 0);
    
    // Agregar ordenamiento y paginación
    sql += ` ORDER BY c.createdAt DESC LIMIT ? OFFSET ?`;
    params.push(limit, skip);
    
    const result = await db.execute({ sql, args: params });
    
    // Transformar resultados
    const clientes = result.rows.map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      email: row.email,
      telefono: row.telefono,
      qrCodigo: row.qrCodigo,
      comprasTotal: row.comprasTotal || 0,
      recompensasPendientes: row.recompensasPendientes || 0,
      recompensasCanjeadas: row.recompensasCanjeadas || 0,
      createdAt: row.createdAt,
      ultimaCompra: row.ultimaCompra || null,
    }));

    return NextResponse.json({
      clientes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listando clientes:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST - Registrar nuevo cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { negocioId, nombre, email, telefono } = body;

    if (!negocioId || !nombre || !email) {
      return NextResponse.json(
        { error: 'Negocio, nombre y email son requeridos' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verificar que el negocio existe
    const negocioResult = await db.execute({
      sql: 'SELECT * FROM Negocio WHERE id = ?',
      args: [negocioId]
    });

    if (negocioResult.rows.length === 0) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const negocio = negocioResult.rows[0] as any;

    // Verificar si ya existe el cliente
    const existenteResult = await db.execute({
      sql: 'SELECT id FROM Cliente WHERE negocioId = ? AND email = ?',
      args: [negocioId, email.toLowerCase()]
    });

    if (existenteResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un cliente con este email en este negocio' },
        { status: 400 }
      );
    }

    // Generar código QR único
    const qrCodigo = `QR-${negocioId.substring(0, 8)}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
    const clienteId = `cli_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    // Crear cliente
    await db.execute({
      sql: `INSERT INTO Cliente (id, negocioId, nombre, email, telefono, qrCodigo, comprasTotal, recompensasPendientes, recompensasCanjeadas, activo, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 1, ?, ?)`,
      args: [clienteId, negocioId, nombre, email.toLowerCase(), telefono || null, qrCodigo, now, now]
    });

    // Enviar notificaciones al dueño
    Promise.all([
      notifyNewClienteToOwner({
        ownerEmail: negocio.emailDestino,
        negocioNombre: negocio.nombre,
        clienteNombre: nombre,
        clienteEmail: email,
        clienteTelefono: telefono,
      }),
      negocio.telegramActivo && negocio.telegramToken && negocio.telegramChatId
        ? telegramNotifyNewCliente({
            token: negocio.telegramToken,
            chatId: negocio.telegramChatId,
            negocioNombre: negocio.nombre,
            clienteNombre: nombre,
            clienteEmail: email,
          })
        : Promise.resolve(),
    ]).catch(console.error);

    return NextResponse.json({
      success: true,
      cliente: {
        id: clienteId,
        nombre,
        email,
        qrCodigo,
      },
    });
  } catch (error) {
    console.error('Error registrando cliente:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
