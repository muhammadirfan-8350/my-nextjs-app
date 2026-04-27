import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const hash = await bcrypt.hash('admin123', 10);
await prisma.user.update({
  where: { email: 'admin@demo.com' },
  data: { passwordHash: hash }
});
console.log('DONE! Password updated successfully');
await prisma.$disconnect();