import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 10);
};

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { name: 'Admin User', role: 'admin' },
    create: {
      email: 'admin@demo.com',
      name: 'Admin User',
      role: 'admin',
      passwordHash: await hashPassword('Admin123!'),
    },
  });

  console.log('Seed completed with admin@demo.com / Admin123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });