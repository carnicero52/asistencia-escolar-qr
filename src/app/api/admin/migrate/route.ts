import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

// API para migrar columnas de notificaciones a la tabla Negocio
// Ejecutar una sola vez: GET /api/admin/migrate

function getDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error('TURSO_DATABASE_URL y DATABASE_AUTH_TOKEN son requeridos');
  }

  return createClient({ url, authToken });
}

export async function GET() {
  try {
    const db = getDb();
    const results: string[] = [];

    // Verificar columnas existentes
    const tableInfo = await db.execute(`PRAGMA table_info(Negocio)`);
    const existingColumns = tableInfo.rows.map(r => r.name as string);
    results.push(`Columnas actuales: ${existingColumns.join(', ')}`);

    // Columnas a agregar
    const columnsToAdd = [
      // Telegram (nuevo formato)
      { name: 'notifTelegramActivo', sql: 'ALTER TABLE Negocio ADD COLUMN notifTelegramActivo INTEGER DEFAULT 0' },
      { name: 'notifTelegramBotToken', sql: 'ALTER TABLE Negocio ADD COLUMN notifTelegramBotToken TEXT' },
      { name: 'notifTelegramChatId', sql: 'ALTER TABLE Negocio ADD COLUMN notifTelegramChatId TEXT' },
      
      // Email
      { name: 'notifEmailActivo', sql: 'ALTER TABLE Negocio ADD COLUMN notifEmailActivo INTEGER DEFAULT 0' },
      { name: 'notifEmailSmtp', sql: 'ALTER TABLE Negocio ADD COLUMN notifEmailSmtp TEXT' },
      { name: 'notifEmailPuerto', sql: 'ALTER TABLE Negocio ADD COLUMN notifEmailPuerto INTEGER DEFAULT 587' },
      { name: 'notifEmailUsuario', sql: 'ALTER TABLE Negocio ADD COLUMN notifEmailUsuario TEXT' },
      { name: 'notifEmailPassword', sql: 'ALTER TABLE Negocio ADD COLUMN notifEmailPassword TEXT' },
      { name: 'notifEmailRemitente', sql: 'ALTER TABLE Negocio ADD COLUMN notifEmailRemitente TEXT' },
      
      // WhatsApp
      { name: 'notifWhatsappActivo', sql: 'ALTER TABLE Negocio ADD COLUMN notifWhatsappActivo INTEGER DEFAULT 0' },
      { name: 'notifWhatsappApiUrl', sql: 'ALTER TABLE Negocio ADD COLUMN notifWhatsappApiUrl TEXT' },
      { name: 'notifWhatsappApiKey', sql: 'ALTER TABLE Negocio ADD COLUMN notifWhatsappApiKey TEXT' },
      { name: 'notifWhatsappNumero', sql: 'ALTER TABLE Negocio ADD COLUMN notifWhatsappNumero TEXT' },
      
      // Google Sheets
      { name: 'googleSheetsActivo', sql: 'ALTER TABLE Negocio ADD COLUMN googleSheetsActivo INTEGER DEFAULT 0' },
      { name: 'googleSheetsId', sql: 'ALTER TABLE Negocio ADD COLUMN googleSheetsId TEXT' },
      { name: 'googleSheetsApiKey', sql: 'ALTER TABLE Negocio ADD COLUMN googleSheetsApiKey TEXT' },
      
      // Campos adicionales
      { name: 'puestoBuscado', sql: 'ALTER TABLE Negocio ADD COLUMN puestoBuscado TEXT' },
      { name: 'requisitos', sql: 'ALTER TABLE Negocio ADD COLUMN requisitos TEXT' },
      { name: 'buscandoPersonal', sql: 'ALTER TABLE Negocio ADD COLUMN buscandoPersonal INTEGER DEFAULT 0' },
      { name: 'whatsapp', sql: 'ALTER TABLE Negocio ADD COLUMN whatsapp TEXT' },
      { name: 'facebook', sql: 'ALTER TABLE Negocio ADD COLUMN facebook TEXT' },
      { name: 'instagram', sql: 'ALTER TABLE Negocio ADD COLUMN instagram TEXT' },
      
      // Configuración IA
      { name: 'modoBot', sql: 'ALTER TABLE Negocio ADD COLUMN modoBot TEXT DEFAULT "hibrido"' },
      { name: 'iaProvider', sql: 'ALTER TABLE Negocio ADD COLUMN iaProvider TEXT DEFAULT "z-ai"' },
      { name: 'iaApiKey', sql: 'ALTER TABLE Negocio ADD COLUMN iaApiKey TEXT' },
      { name: 'iaModelo', sql: 'ALTER TABLE Negocio ADD COLUMN iaModelo TEXT' },
      { name: 'iaTemperature', sql: 'ALTER TABLE Negocio ADD COLUMN iaTemperature REAL DEFAULT 0.7' },
      
      // Base de conocimiento
      { name: 'conocimientoBase', sql: 'ALTER TABLE Negocio ADD COLUMN conocimientoBase TEXT' },
      { name: 'conocimientoArchivos', sql: 'ALTER TABLE Negocio ADD COLUMN conocimientoArchivos TEXT' },
    ];

    let added = 0;
    let skipped = 0;

    for (const col of columnsToAdd) {
      if (existingColumns.includes(col.name)) {
        results.push(`⏭️ ${col.name} ya existe`);
        skipped++;
      } else {
        try {
          await db.execute(col.sql);
          results.push(`✅ ${col.name} agregada`);
          added++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('duplicate column name')) {
            results.push(`⏭️ ${col.name} ya existe`);
            skipped++;
          } else {
            results.push(`❌ Error en ${col.name}: ${errorMessage}`);
          }
        }
      }
    }

    // Migrar datos antiguos de Telegram si existen
    if (existingColumns.includes('telegramActivo') && !existingColumns.includes('notifTelegramActivo')) {
      try {
        await db.execute(`
          UPDATE Negocio 
          SET notifTelegramActivo = telegramActivo,
              notifTelegramBotToken = telegramToken,
              notifTelegramChatId = telegramChatId
          WHERE telegramActivo = 1
        `);
        results.push('✅ Datos de Telegram migrados');
      } catch {
        results.push('⚠️ No se pudieron migrar datos de Telegram');
      }
    }

    // Verificar estado final
    const finalInfo = await db.execute(`PRAGMA table_info(Negocio)`);
    const finalColumns = finalInfo.rows.map(r => r.name as string);

    return NextResponse.json({
      success: true,
      message: 'Migración completada',
      stats: { added, skipped, total: columnsToAdd.length },
      results,
      finalColumns
    });

  } catch (error) {
    console.error('Error en migración:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
}
