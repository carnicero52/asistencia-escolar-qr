import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST - Subir logo de la institución
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de archivo no permitido. Use JPG, PNG, GIF o WebP' 
      }, { status: 400 });
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'El archivo es muy grande. Máximo 2MB' 
      }, { status: 400 });
    }

    // Crear directorio si no existe
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Generar nombre único
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `logo-${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Guardar archivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // URL pública del archivo
    const logoUrl = `/uploads/${fileName}`;

    // Actualizar configuración
    await db.configAsistencia.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        logo: logoUrl
      },
      update: {
        logo: logoUrl
      }
    });

    return NextResponse.json({ 
      message: 'Logo actualizado correctamente',
      logo: logoUrl 
    });
  } catch (error) {
    console.error('Error al subir logo:', error);
    return NextResponse.json({ error: 'Error al subir el logo' }, { status: 500 });
  }
}
