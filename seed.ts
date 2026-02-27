import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default config
  await prisma.botConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Asistente',
      greeting: '¡Hola! ¿En qué puedo ayudarte?',
      placeholder: 'Escribe tu mensaje...',
      password: 'admin123'
    }
  });

  // Create default Q&A
  const defaultQA = [
    { keywords: 'hola, buenos dias, buenas, hey, saludos', response: '¡Hola! ¿En qué puedo ayudarte hoy?' },
    { keywords: 'precio, costo, cuanto cuesta, valor', response: 'Nuestros precios varían según el servicio. ¿Te gustaría más información?' },
    { keywords: 'horario, hora, abierto, cuando', response: 'Atendemos de Lunes a Viernes de 9:00 AM a 6:00 PM.' },
    { keywords: 'contacto, telefono, llamar, whatsapp', response: 'Puedes contactarnos al teléfono: +58 412 1234567' },
    { keywords: 'ubicacion, direccion, donde, dirección', response: 'Estamos en Avenida Principal, Edificio Centro, Piso 3.' },
    { keywords: 'gracias, thanks, muchas gracias', response: '¡De nada! 😊 ¿Hay algo más en lo que pueda ayudarte?' },
  ];

  for (const qa of defaultQA) {
    await prisma.qA.create({
      data: qa
    });
  }

  console.log('Base de datos inicializada correctamente');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
