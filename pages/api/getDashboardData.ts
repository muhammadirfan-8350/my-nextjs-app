import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { startDate, endDate } = req.query;

  const where = {
    date: {
      gte: startDate ? new Date(String(startDate)) : new Date('2026-04-01'),
      lte: endDate ? new Date(String(endDate)) : new Date('2026-04-30'),
    },
  };

  const metrics = await prisma.campaignData.aggregate({
    where,
    _sum: { spend: true, conversions: true, roas: true },
    _avg: { cpa: true },
  });

  return res.status(200).json({
    totalSpend: metrics._sum.spend ?? 0,
    totalConversions: metrics._sum.conversions ?? 0,
    avgCpa: metrics._avg.cpa ?? 0,
    roas: metrics._sum.roas ?? 0,
  });
}
