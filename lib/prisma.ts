import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: "sqlserver://223.123.92.220:1433;database=Campaign Data;user=saas_user;password=SaasPass123!;trustServerCertificate=true",
    },
  },
});

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;