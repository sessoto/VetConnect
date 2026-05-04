import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password1234', 12);

  await prisma.clinic.upsert({
    where: { id: 'demo-clinic' },
    update: {},
    create: {
      id: 'demo-clinic',
      name: 'Clínica Demo',
      users: {
        create: [
          { email: 'admin@demo.vet', name: 'Admin Demo', role: 'admin', passwordHash },
          { email: 'vet@demo.vet', name: 'Veterinaria Demo', role: 'vet', passwordHash },
          { email: 'asistente@demo.vet', name: 'Asistente Demo', role: 'assistant', passwordHash },
        ],
      },
    },
  });

  console.log('Seed complete. Login: admin@demo.vet / Password1234');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
