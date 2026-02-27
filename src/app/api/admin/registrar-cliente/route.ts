import { createClient } from '@libsql/client';
import { verifyAdminSession } from '@/lib/auth';
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

// POST - Registrar cliente manualmente desde el panel admin
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
    const { nombre, email, telefono, comprasIniciales } = body;

    if (!nombre || !email) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos' },
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
        { error: 'Ya existe un cliente con este email' },
        { status: 400 }
      );
    }

    // Calcular compras iniciales y recompensas
    const comprasTotal = comprasIniciales || 0;
    const recompensasPendientes = Math.floor(comprasTotal / 10);

    // Generar código QR único
    const qrCodigo = `QR-${negocioId.substring(0, 8)}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
    const clienteId = `cli_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    // Crear cliente
    await db.execute({
      sql: `INSERT INTO Cliente (id, negocioId, nombre, email, telefono, qrCodigo, comprasTotal, recompensasPendientes, recompensasCanjeadas, activo, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
      args: [clienteId, negocioId, nombre, email.toLowerCase(), telefono || null, qrCodigo, comprasTotal, recompensasPendientes, now, now]
    });

    // Si hay compras iniciales, registrarlas
    if (comprasTotal > 0) {
      for (let i = 1; i <= comprasTotal; i++) {
        const compraId = `com_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        await db.execute({
          sql: `INSERT INTO Compra (id, clienteId, negocioId, compraNumero, esRecompensa, fecha)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [compraId, clienteId, negocioId, i, i % 10 === 0 ? 1 : 0, now]
        });
      }
    }

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
        comprasTotal,
        recompensasPendientes,
      },
    });
  } catch (error) {
    console.error('Error registrando cliente:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
