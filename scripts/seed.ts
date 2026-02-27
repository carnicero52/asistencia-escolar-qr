import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Verificar si ya existe
  const existing = await prisma.negocio.findUnique({
    where: { slug: 'bufete-yovany' }
  });
  
  if (existing) {
    console.log('✅ El negocio ya existe:', existing.slug);
    console.log('   Email:', existing.email);
    console.log('   Password: demo123');
    return;
  }
  
  const hashedPassword = await bcrypt.hash('demo123', 10);
  
  const conocimientoBase = `=== SERVICIOS ===
- Consultas laborales
- Despidos injustificados
- Liquidaciones y finiquitos
- Contratos laborales
- Acoso laboral
- Horas extras no pagadas
- Prestaciones laborales
- Demandas laborales

=== PRECIOS ===
- Consulta inicial: GRATIS
- Revisión de caso: $500 MXN
- Demanda laboral: desde $5,000 MXN
- Seguimiento de caso: cuota convenida

=== INFORMACIÓN ===
Más de 10 años de experiencia en derecho laboral.
Atención personalizada.
Citas disponibles de lunes a viernes.`;
  
  const negocio = await prisma.negocio.create({
    data: {
      nombre: 'Bufete Dr. Yovany Martínez',
      slug: 'bufete-yovany',
      email: 'demo@bufete.com',
      password: hashedPassword,
      telefono: '+52 123 456 7890',
      direccion: 'Av. Principal #123, Ciudad de México, México',
      descripcion: 'Bufete de Derecho Laboral - Especialistas en defensa de trabajadores y empleadores',
      whatsapp: '+52 123 456 7890',
      horarioActivo: true,
      horarioLunes: '9:00 - 18:00',
      horarioMartes: '9:00 - 18:00',
      horarioMiercoles: '9:00 - 18:00',
      horarioJueves: '9:00 - 18:00',
      horarioViernes: '9:00 - 18:00',
      horarioSabado: '9:00 - 14:00',
      horarioDomingo: 'Cerrado',
      modoBot: 'hibrido',
      iaProvider: 'z-ai',
      iaTemperature: 0.7,
      conocimientoBase
    }
  });
  
  console.log('✅ Negocio creado:', negocio.slug);
  console.log('   Email:', negocio.email);
  console.log('   Password: demo123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
