import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { campaignName, platform, spend, conversions, clientId, productId } = req.body;
    if (!campaignName || !platform) {
      return res.status(400).json({ message: 'Campaign name and platform are required' });
    }

    const campaign = await prisma.campaignData.create({
      data: {
        campaignName,
        platform,
        spend: Number(spend || 0),
        impressions: 0,
        clicks: 0,
        conversions: Number(conversions || 0),
        cpa: Number(conversions && spend ? Number(spend) / Number(conversions) : 0),
        roas: 0,
        date: new Date(),
        clientId: clientId || undefined,
        productId: productId || undefined,
      },
    });

    return res.status(201).json(campaign);
  }

  if (req.method === 'GET') {
    const campaigns = await prisma.campaignData.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.status(200).json(campaigns);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ message: 'Method not allowed' });
}
