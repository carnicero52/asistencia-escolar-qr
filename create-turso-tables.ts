// Script para crear tablas en Turso
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

async function createTables() {
  console.log('🔗 Conectando a Turso:', tursoUrl)
  
  try {
    // Crear tabla Negocio con todas las columnas
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Negocio (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        telefono TEXT,
        direccion TEXT,
        descripcion TEXT,
        logoUrl TEXT,
        qrUrl TEXT,
        activo INTEGER DEFAULT 1,
        
        -- Reclutamiento
        puestoBuscado TEXT,
        requisitos TEXT,
        buscandoPersonal INTEGER DEFAULT 0,
        
        -- Redes sociales
        whatsapp TEXT,
        facebook TEXT,
        instagram TEXT,
        
        -- Telegram (legacy - mantener por compatibilidad)
        telegramToken TEXT,
        telegramChatId TEXT,
        telegramActivo INTEGER DEFAULT 0,
        
        -- Notificaciones Telegram (nuevo)
        notifTelegramActivo INTEGER DEFAULT 0,
        notifTelegramBotToken TEXT,
        notifTelegramChatId TEXT,
        
        -- Notificaciones Email
        notifEmailActivo INTEGER DEFAULT 0,
        notifEmailSmtp TEXT,
        notifEmailPuerto INTEGER DEFAULT 587,
        notifEmailUsuario TEXT,
        notifEmailPassword TEXT,
        notifEmailRemitente TEXT,
        
        -- Notificaciones WhatsApp
        notifWhatsappActivo INTEGER DEFAULT 0,
        notifWhatsappApiUrl TEXT,
        notifWhatsappApiKey TEXT,
        notifWhatsappNumero TEXT,
        
        -- Integraciones
        googleSheetsActivo INTEGER DEFAULT 0,
        googleSheetsId TEXT,
        googleSheetsApiKey TEXT,
        
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Tabla Negocio creada')

    // Crear tabla Cliente
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Cliente (
        id TEXT PRIMARY KEY,
        negocioId TEXT NOT NULL,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL,
        telefono TEXT,
        qrCodigo TEXT UNIQUE NOT NULL,
        comprasTotal INTEGER DEFAULT 0,
        recompensasPendientes INTEGER DEFAULT 0,
        recompensasCanjeadas INTEGER DEFAULT 0,
        activo INTEGER DEFAULT 1,
        bloqueado INTEGER DEFAULT 0,
        motivoBloqueo TEXT,
        bloqueadoEn TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (negocioId) REFERENCES Negocio(id) ON DELETE CASCADE,
        UNIQUE(negocioId, email)
      )
    `)
    console.log('✅ Tabla Cliente creada')

    // Crear tabla Compra
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Compra (
        id TEXT PRIMARY KEY,
        clienteId TEXT NOT NULL,
        negocioId TEXT NOT NULL,
        fecha TEXT DEFAULT CURRENT_TIMESTAMP,
        compraNumero INTEGER NOT NULL,
        esRecompensa INTEGER DEFAULT 0,
        canjeada INTEGER DEFAULT 0,
        sospechosa INTEGER DEFAULT 0,
        FOREIGN KEY (clienteId) REFERENCES Cliente(id) ON DELETE CASCADE,
        FOREIGN KEY (negocioId) REFERENCES Negocio(id) ON DELETE CASCADE
      )
    `)
    console.log('✅ Tabla Compra creada')

    // Crear tabla Sesion (para autenticación)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Sesion (
        id TEXT PRIMARY KEY,
        negocioId TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expiresAt TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (negocioId) REFERENCES Negocio(id) ON DELETE CASCADE
      )
    `)
    console.log('✅ Tabla Sesion creada')

    // Crear tabla Candidato (para sistema de reclutamiento)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Candidato (
        id TEXT PRIMARY KEY,
        negocioId TEXT NOT NULL,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL,
        telefono TEXT NOT NULL,
        direccion TEXT,
        puestoSolicitado TEXT,
        experiencia TEXT,
        educacion TEXT,
        habilidades TEXT,
        experienciaDetallada TEXT,
        disponibilidad TEXT,
        cvUrl TEXT,
        fotoUrl TEXT,
        estado TEXT DEFAULT 'nuevo',
        notas TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (negocioId) REFERENCES Negocio(id) ON DELETE CASCADE,
        UNIQUE(negocioId, email)
      )
    `)
    console.log('✅ Tabla Candidato creada')

    // Crear tabla AdminSession (legacy - mantener por compatibilidad)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS AdminSession (
        id TEXT PRIMARY KEY,
        negocioId TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expiresAt TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (negocioId) REFERENCES Negocio(id) ON DELETE CASCADE
      )
    `)
    console.log('✅ Tabla AdminSession creada')

    // Crear tabla AlertaSeguridad
    await db.execute(`
      CREATE TABLE IF NOT EXISTS AlertaSeguridad (
        id TEXT PRIMARY KEY,
        negocioId TEXT NOT NULL,
        clienteId TEXT,
        tipo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        datos TEXT,
        revisada INTEGER DEFAULT 0,
        creadaEn TEXT DEFAULT CURRENT_TIMESTAMP,
        revisadaEn TEXT,
        revisadaPor TEXT,
        FOREIGN KEY (negocioId) REFERENCES Negocio(id) ON DELETE CASCADE,
        FOREIGN KEY (clienteId) REFERENCES Cliente(id) ON DELETE SET NULL
      )
    `)
    console.log('✅ Tabla AlertaSeguridad creada')

    // Crear índices
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_compra_clienteId ON Compra(clienteId)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_compra_negocioId ON Compra(negocioId)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_compra_fecha ON Compra(fecha)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_sesion_negocioId ON Sesion(negocioId)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_adminsession_negocioId ON AdminSession(negocioId)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_alerta_negocioId ON AlertaSeguridad(negocioId)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_alerta_clienteId ON AlertaSeguridad(clienteId)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_alerta_creadaEn ON AlertaSeguridad(creadaEn)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_candidato_negocioId ON Candidato(negocioId)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_candidato_estado ON Candidato(estado)`)
    console.log('✅ Índices creados')

    console.log('\n🎉 ¡Todas las tablas fueron creadas exitosamente!')
  } catch (error) {
    console.error('❌ Error creando tablas:', error)
    process.exit(1)
  }
}

createTables()
