import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN
  
  return NextResponse.json({
    database_url: dbUrl ? {
      present: true,
      value: dbUrl.substring(0, 50) + '...',
      isLibsql: dbUrl.startsWith('libsql://')
    } : { present: false },
    turso_database_url: tursoUrl ? {
      present: true,
      value: tursoUrl.substring(0, 50) + '...',
      isLibsql: tursoUrl.startsWith('libsql://')
    } : { present: false },
    database_auth_token: authToken ? {
      present: true,
      length: authToken.length
    } : { present: false },
    node_env: process.env.NODE_ENV
  })
}
