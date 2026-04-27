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
    spend:       spend       ? parseFloat(spend)     : 0,
    conversions: conversions ? parseInt(conversions) : 0,
    impressions: 0,
    clicks:      0,
    cpa:         0,
    roas:        0,
    date:        new Date(),
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
