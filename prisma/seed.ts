
import prisma from '../lib/prisma'; // ✅ SAHI
//import prisma from '../lib/prisma.ts';
//import crypto from 'crypto';

import bcrypt from 'bcryptjs';

const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 10);
};

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { name: 'Admin User', role: 'admin' },
    create: {
      email: 'admin@demo.com',
      name: 'Admin User',
      role: 'admin',
     // passwordHash: hashPassword('Admin123!'),
     passwordHash: await hashPassword('Admin123!'),
    },
  });

  const client = await prisma.client.upsert({
    where: { name: 'Digital Channels PKR' },
    update: { industry: 'Telecom', status: 'Active' },
    create: { name: 'Digital Channels PKR', industry: 'Telecom', status: 'Active' },
  });

  const productA = await prisma.productPerformance.upsert({
    where: { name: 'Telenor' },
    update: { spend: 90000000, conversions: 780000, impressions: 120000000, clicks: 4500000, date: new Date('2026-04-30') },
    create: { name: 'Telenor', spend: 90000000, conversions: 780000, impressions: 120000000, clicks: 4500000, date: new Date('2026-04-30') },
  });

  const productB = await prisma.productPerformance.upsert({
    where: { name: 'Ufone' },
    update: { spend: 25000000, conversions: 120000, impressions: 39000000, clicks: 1250000, date: new Date('2026-04-30') },
    create: { name: 'Ufone', spend: 25000000, conversions: 120000, impressions: 39000000, clicks: 1250000, date: new Date('2026-04-30') },
  });

  await prisma.campaignData.createMany({
    data: [
      {
        campaignName: 'DC_Feb 2026 - Simosa Global',
        platform: 'Google Ads',
        productId: productA.id,
        clientId: client.id,
        spend: 36750000,
        impressions: 853331432,
        clicks: 32479813,
        conversions: 7945381,
        cpa: 13.56,
        roas: 1.4,
        date: new Date('2026-04-19'),
      },
      {
        campaignName: 'SEG_Apr 2026 - Weekly X',
        platform: 'Meta Ads',
        productId: productB.id,
        clientId: client.id,
        spend: 13813938,
        impressions: 269249318,
        clicks: 3431956,
        conversions: 9014529,
        cpa: 1.53,
        roas: 1.8,
        date: new Date('2026-04-18'),
      },
      {
        campaignName: 'DC_Aug 2025 - Simosa Install',
        platform: 'TikTok Ads',
        productId: productB.id,
        clientId: client.id,
        spend: 7484464,
        impressions: 113527645,
        clicks: 9077277,
        conversions: 837897,
        cpa: 8.93,
        roas: 1.2,
        date: new Date('2026-04-17'),
      },
    ],
  });

  const metricsData = Array.from({ length: 18 }, (_, index) => {
    const date = new Date('2026-04-01');
    date.setDate(date.getDate() + index);
    const spend = 6000000 + index * 300000;
    const conversions = 300000 + index * 12000;
    return {
      date,
      totalSpend: spend,
      conversions,
      avgCpa: Math.max(5.2, 20 - index * 0.5),
      roas: Number((1.2 + index * 0.04).toFixed(2)),
    };
  });

  for (const metric of metricsData) {
    await prisma.dashboardMetric.upsert({
      where: { date: metric.date },
      update: metric,
      create: metric,
    });
  }

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
