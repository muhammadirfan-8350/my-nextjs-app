import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const platform = String(req.query.platform || 'Google Ads');
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 10);
  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : new Date('2026-04-01');
  const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : new Date('2026-04-30');

  const where = {
    platform,
    date: {
      gte: startDate,
      lte: endDate,
    },
  };

  const [campaigns, total] = await Promise.all([
    prisma.campaignData.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        campaignName: true,
        platform: true,
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
      },
    }),
    prisma.campaignData.count({ where }),
  ]);

  return res.status(200).json({ campaigns, total, page, pageSize });
}
