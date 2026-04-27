import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : new Date('2026-04-01');
  const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : new Date('2026-04-30');

  const metrics = await prisma.dashboardMetric.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
    select: { date: true, totalSpend: true, conversions: true },
  });

  res.status(200).json(metrics.map((metric) => ({ date: metric.date.toISOString().slice(0, 10), spend: metric.totalSpend, conversions: metric.conversions })));
}
