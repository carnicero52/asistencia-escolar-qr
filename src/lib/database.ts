import { createClient } from '@libsql/client'

// Cliente de Turso
function createTursoClient() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  if (!url || !authToken || !url.startsWith('libsql://')) {
    throw new Error('TURSO_DATABASE_URL y DATABASE_AUTH_TOKEN son requeridos')
  }

  return createClient({ url, authToken })
}

// Cliente singleton
let client: ReturnType<typeof createClient> | null = null

function getClient() {
  if (!client) {
    client = createTursoClient()
  }
  return client
}

// Helper para ejecutar queries - Asistente Pro
export const db = {
  // Negocio operations
  negocio: {
    async findFirst(args: { where: { email?: string; id?: string; slug?: string } }) {
      const db = getClient()
      if (args.where.email) {
        const result = await db.execute({
          sql: 'SELECT * FROM Negocio WHERE email = ?',
          args: [args.where.email.toLowerCase()]
        })
        return result.rows[0] as any || null
      }
      if (args.where.id) {
        const result = await db.execute({
          sql: 'SELECT * FROM Negocio WHERE id = ?',
          args: [args.where.id]
        })
        return result.rows[0] as any || null
      }
      if (args.where.slug) {
        const result = await db.execute({
          sql: 'SELECT * FROM Negocio WHERE slug = ?',
          args: [args.where.slug]
        })
        return result.rows[0] as any || null
      }
      return null
    },

    async findUnique(args: { where: { id?: string; slug?: string; email?: string } }) {
      return this.findFirst(args as any)
    },

    async create(args: { data: Record<string, any> }) {
      const db = getClient()
      const data = { 
        id: `neg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
        ...args.data 
      }
      const columns = Object.keys(data).join(', ')
      const placeholders = Object.keys(data).map(() => '?').join(', ')
      const values = Object.values(data)
      
      await db.execute({
        sql: `INSERT INTO Negocio (${columns}) VALUES (${placeholders})`,
        args: values as any[]
      })
      
      return data
    },

    async update(args: { where: { id: string }; data: Record<string, any> }) {
      const db = getClient()
      const data = args.data
      const updates = Object.keys(data).map(k => `${k} = ?`).join(', ')
      const values = [...Object.values(data), args.where.id]
      
      await db.execute({
        sql: `UPDATE Negocio SET ${updates} WHERE id = ?`,
        args: values as any[]
      })
      
      return { ...data, id: args.where.id }
    }
  },

  // Candidato operations
  candidato: {
    async findFirst(args: { where: { id?: string; negocioId?: string; email?: string } }) {
      const db = getClient()
      let sql = 'SELECT * FROM Candidato WHERE 1=1'
      const params: any[] = []
      
      if (args.where.id) {
        sql += ' AND id = ?'
        params.push(args.where.id)
      }
      if (args.where.negocioId) {
        sql += ' AND negocioId = ?'
        params.push(args.where.negocioId)
      }
      if (args.where.email) {
        sql += ' AND email = ?'
        params.push(args.where.email.toLowerCase())
      }
      
      sql += ' LIMIT 1'
      
      const result = await db.execute({ sql, args: params })
      return result.rows[0] as any || null
    },

    async findUnique(args: { where: { id?: string; negocioId_email?: { negocioId: string; email: string } } }) {
      const db = getClient()
      let sql = 'SELECT * FROM Candidato WHERE 1=1'
      const params: any[] = []
      
      if (args.where.id) {
        sql += ' AND id = ?'
        params.push(args.where.id)
      }
      if (args.where.negocioId_email) {
        sql += ' AND negocioId = ? AND email = ?'
        params.push(args.where.negocioId_email.negocioId, args.where.negocioId_email.email)
      }
      
      sql += ' LIMIT 1'
      
      const result = await db.execute({ sql, args: params })
      return result.rows[0] as any || null
    },

    async findMany(args: { where: { negocioId: string; estado?: string }; orderBy?: { createdAt: string }; take?: number; skip?: number }) {
      const db = getClient()
      let sql = 'SELECT * FROM Candidato WHERE negocioId = ?'
      const params: any[] = [args.where.negocioId]
      
      if (args.where.estado) {
        sql += ' AND estado = ?'
        params.push(args.where.estado)
      }
      
      sql += ' ORDER BY createdAt DESC'
      
      if (args.take) {
        sql += ' LIMIT ?'
        params.push(args.take)
      }
      if (args.skip) {
        sql += ' OFFSET ?'
        params.push(args.skip)
      }
      
      const result = await db.execute({ sql, args: params })
      return result.rows as any[]
    },

    async create(args: { data: Record<string, any> }) {
      const db = getClient()
      const data = { 
        id: `cand_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
        ...args.data 
      }
      const columns = Object.keys(data).join(', ')
      const placeholders = Object.keys(data).map(() => '?').join(', ')
      const values = Object.values(data)
      
      await db.execute({
        sql: `INSERT INTO Candidato (${columns}) VALUES (${placeholders})`,
        args: values as any[]
      })
      
      return data
    },

    async update(args: { where: { id: string }; data: Record<string, any> }) {
      const db = getClient()
      const data = args.data
      const updates = Object.keys(data).map(k => `${k} = ?`).join(', ')
      const values = [...Object.values(data), args.where.id]
      
      await db.execute({
        sql: `UPDATE Candidato SET ${updates} WHERE id = ?`,
        args: values as any[]
      })
      
      return { ...data, id: args.where.id }
    },

    async delete(args: { where: { id: string } }) {
      const db = getClient()
      await db.execute({
        sql: 'DELETE FROM Candidato WHERE id = ?',
        args: [args.where.id]
      })
    },

    async count(args: { where: { negocioId: string; estado?: string } }) {
      const db = getClient()
      let sql = 'SELECT COUNT(*) as count FROM Candidato WHERE negocioId = ?'
      const params: any[] = [args.where.negocioId]
      
      if (args.where.estado) {
        sql += ' AND estado = ?'
        params.push(args.where.estado)
      }
      
      const result = await db.execute({ sql, args: params })
      return Number((result.rows[0] as any).count)
    }
  },

  // Sesion operations
  sesion: {
    async findUnique(args: { where: { token: string } }) {
      const db = getClient()
      const result = await db.execute({
        sql: 'SELECT * FROM Sesion WHERE token = ?',
        args: [args.where.token]
      })
      return result.rows[0] as any || null
    },

    async create(args: { data: Record<string, any> }) {
      const db = getClient()
      const data = { 
        id: `ses_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
        ...args.data 
      }
      const columns = Object.keys(data).join(', ')
      const placeholders = Object.keys(data).map(() => '?').join(', ')
      const values = Object.values(data)
      
      await db.execute({
        sql: `INSERT INTO Sesion (${columns}) VALUES (${placeholders})`,
        args: values as any[]
      })
      
      return data
    },

    async delete(args: { where: { token: string } }) {
      const db = getClient()
      await db.execute({
        sql: 'DELETE FROM Sesion WHERE token = ?',
        args: [args.where.token]
      })
    },

    async deleteMany(args: { where: { negocioId: string } }) {
      const db = getClient()
      await db.execute({
        sql: 'DELETE FROM Sesion WHERE negocioId = ?',
        args: [args.where.negocioId]
      })
    }
  },

  // Raw query helper
  async execute(sql: string, args: any[] = []) {
    const db = getClient()
    return db.execute({ sql, args })
  },

  // Transaction helper
  async $transaction(operations: Promise<any>[]) {
    const results = []
    for (const op of operations) {
      results.push(await op)
    }
    return results
  }
}
