// Script para agregar columnas faltantes de notificaciones a la tabla Negocio en Turso
import { createClient } from '@libsql/client'

const tursoUrl = process.env.TURSO_DATABASE_URL!
const tursoToken = process.env.DATABASE_AUTH_TOKEN!

if (!tursoUrl || !tursoToken) {
  console.error('❌ Faltan variables de entorno TURSO_DATABASE_URL o DATABASE_AUTH_TOKEN')
  process.exit(1)
}

const db = createClient({
  url: tursoUrl,
  authToken: tursoToken,
})

async function migrate() {
  console.log('🔗 Conectando a Turso:', tursoUrl)
  console.log('📦 Iniciando migración de columnas...\n')
  
  try {
    // Verificar columnas existentes
    const tableInfo = await db.execute(`PRAGMA table_info(Negocio)`)
    const existingColumns = tableInfo.rows.map(r => r.name)
    console.log('📋 Columnas actuales:', existingColumns.join(', '))
    
    // Columnas a agregar
    const columnsToAdd = [
      // Telegram (renombrado para consistencia)
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
      
      // Campos adicionales para reclutamiento
      { name: 'puestoBuscado', sql: 'ALTER TABLE Negocio ADD COLUMN puestoBuscado TEXT' },
      { name: 'requisitos', sql: 'ALTER TABLE Negocio ADD COLUMN requisitos TEXT' },
      { name: 'buscandoPersonal', sql: 'ALTER TABLE Negocio ADD COLUMN buscandoPersonal INTEGER DEFAULT 0' },
      { name: 'whatsapp', sql: 'ALTER TABLE Negocio ADD COLUMN whatsapp TEXT' },
      { name: 'facebook', sql: 'ALTER TABLE Negocio ADD COLUMN facebook TEXT' },
      { name: 'instagram', sql: 'ALTER TABLE Negocio ADD COLUMN instagram TEXT' },
    ]
    
    let added = 0
    let skipped = 0
    
    for (const col of columnsToAdd) {
      if (existingColumns.includes(col.name)) {
        console.log(`⏭️  Columna ${col.name} ya existe, saltando...`)
        skipped++
      } else {
        try {
          await db.execute(col.sql)
          console.log(`✅ Columna ${col.name} agregada`)
          added++
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (errorMessage.includes('duplicate column name')) {
            console.log(`⏭️  Columna ${col.name} ya existe`)
            skipped++
          } else {
            console.error(`❌ Error agregando columna ${col.name}:`, errorMessage)
          }
        }
      }
    }
    
    // Migrar datos de telegram antiguos si existen
    if (existingColumns.includes('telegramActivo') && !existingColumns.includes('notifTelegramActivo')) {
      try {
        await db.execute(`
          UPDATE Negocio 
          SET notifTelegramActivo = telegramActivo,
              notifTelegramBotToken = telegramToken,
              notifTelegramChatId = telegramChatId
          WHERE telegramActivo = 1
        `)
        console.log('✅ Datos de Telegram migrados')
      } catch {
        console.log('⚠️  No se pudieron migrar datos de Telegram antiguos')
      }
    }
    
    console.log(`\n🎉 Migración completada!`)
    console.log(`   - Columnas agregadas: ${added}`)
    console.log(`   - Columnas saltadas: ${skipped}`)
    
    // Verificar columnas finales
    const finalInfo = await db.execute(`PRAGMA table_info(Negocio)`)
    console.log('\n📋 Columnas finales:', finalInfo.rows.map(r => r.name).join(', '))
    
  } catch (error) {
    console.error('❌ Error en migración:', error)
    process.exit(1)
  }
}

migrate()
