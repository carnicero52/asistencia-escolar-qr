import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';
import { createClient } from '@libsql/client';
import { nanoid } from 'nanoid';

const execAsync = promisify(exec);

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:/home/z/my-project/db/custom.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
  });
}

// Verificar sesión
async function verifySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  
  if (!token) return null;

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT s.negocioId FROM Sesion s WHERE s.token = ? AND s.expiresAt > ?`,
    args: [token, new Date().toISOString()]
  });

  return result.rows.length > 0 ? result.rows[0].negocioId as string : null;
}

// Extraer texto de PDF usando Python con pdfplumber
async function extractTextFromPDF(filePath: string): Promise<string> {
  const pythonScript = `
import pdfplumber
import sys

try:
    text = ""
    with pdfplumber.open("${filePath}") as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text += page_text + "\\n\\n"
    print(text)
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

  const scriptPath = `/tmp/extract_${nanoid()}.py`;
  await fs.writeFile(scriptPath, pythonScript);

  try {
    const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`);
    
    if (stderr && stderr.includes('ERROR')) {
      throw new Error(stderr);
    }
    
    return stdout.trim();
  } finally {
    await fs.unlink(scriptPath).catch(() => {});
  }
}

// GET - Obtener conocimiento actual
export async function GET() {
  try {
    const negocioId = await verifySession();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getDb();
    const result = await db.execute({
      sql: `SELECT conocimientoBase, conocimientoArchivos FROM Negocio WHERE id = ?`,
      args: [negocioId]
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const row = result.rows[0];
    let archivos = [];
    try {
      archivos = row.conocimientoArchivos ? JSON.parse(row.conocimientoArchivos as string) : [];
    } catch {
      archivos = [];
    }

    return NextResponse.json({
      conocimiento: row.conocimientoBase || '',
      archivos
    });
  } catch (error) {
    console.error('Error en GET conocimiento:', error);
    return NextResponse.json({ error: 'Error al obtener conocimiento' }, { status: 500 });
  }
}

// POST - Subir y procesar PDF
export async function POST(request: NextRequest) {
  try {
    const negocioId = await verifySession();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const textoManual = formData.get('texto') as string | null;

    const db = getDb();

    // Obtener conocimiento actual
    const currentResult = await db.execute({
      sql: `SELECT conocimientoBase, conocimientoArchivos FROM Negocio WHERE id = ?`,
      args: [negocioId]
    });

    const current = currentResult.rows[0];
    let conocimientoActual = (current?.conocimientoBase as string) || '';
    let archivosActuales: Array<{nombre: string, fecha: string, caracteres: number}> = [];
    try {
      archivosActuales = current?.conocimientoArchivos ? JSON.parse(current.conocimientoArchivos as string) : [];
    } catch {
      archivosActuales = [];
    }

    if (file && file.type === 'application/pdf') {
      // Procesar PDF
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Guardar temporalmente
      const tempPath = path.join('/tmp', `pdf_${nanoid()}.pdf`);
      await fs.writeFile(tempPath, buffer);

      try {
        // Extraer texto
        const textoExtraido = await extractTextFromPDF(tempPath);
        
        if (!textoExtraido || textoExtraido.length < 50) {
          return NextResponse.json({ 
            error: 'No se pudo extraer texto del PDF. Asegúrate de que no sea un PDF escaneado (imagen).' 
          }, { status: 400 });
        }

        // Agregar al conocimiento existente
        const nuevoContenido = `\n\n=== DOCUMENTO: ${file.name} ===\n${textoExtraido}`;
        conocimientoActual += nuevoContenido;

        // Agregar a la lista de archivos
        archivosActuales.push({
          nombre: file.name,
          fecha: new Date().toISOString(),
          caracteres: textoExtraido.length
        });

        // Guardar en BD
        await db.execute({
          sql: `UPDATE Negocio SET conocimientoBase = ?, conocimientoArchivos = ? WHERE id = ?`,
          args: [conocimientoActual, JSON.stringify(archivosActuales), negocioId]
        });

        return NextResponse.json({
          success: true,
          message: `PDF procesado: ${textoExtraido.length} caracteres extraídos`,
          archivos: archivosActuales
        });

      } finally {
        await fs.unlink(tempPath).catch(() => {});
      }

    } else if (textoManual) {
      // Agregar texto manual
      const nuevoContenido = `\n\n=== TEXTO AGREGADO ===\n${textoManual}`;
      conocimientoActual += nuevoContenido;

      await db.execute({
        sql: `UPDATE Negocio SET conocimientoBase = ? WHERE id = ?`,
        args: [conocimientoActual, negocioId]
      });

      return NextResponse.json({
        success: true,
        message: 'Texto agregado correctamente'
      });

    } else {
      return NextResponse.json({ 
        error: 'Se requiere un archivo PDF o texto para agregar' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en POST conocimiento:', error);
    return NextResponse.json({ 
      error: 'Error al procesar el documento',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// DELETE - Limpiar conocimiento
export async function DELETE() {
  try {
    const negocioId = await verifySession();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getDb();
    await db.execute({
      sql: `UPDATE Negocio SET conocimientoBase = '', conocimientoArchivos = '[]' WHERE id = ?`,
      args: [negocioId]
    });

    return NextResponse.json({
      success: true,
      message: 'Base de conocimiento limpiada'
    });

  } catch (error) {
    console.error('Error en DELETE conocimiento:', error);
    return NextResponse.json({ error: 'Error al limpiar conocimiento' }, { status: 500 });
  }
}
