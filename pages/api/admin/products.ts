import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const products = await prisma.productPerformance.findMany({ orderBy: { name: 'asc' } });
    return res.status(200).json(products);
  }

  if (req.method === 'POST') {
    const { name, spend, conversions, impressions, clicks } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Product name is required' });
    }

    const product = await prisma.productPerformance.create({
      data: {
        name,
        spend: Number(spend || 0),
        conversions: Number(conversions || 0),
        impressions: Number(impressions || 0),
        clicks: Number(clicks || 0),
        date: new Date(),
      },
    });
    return res.status(201).json(product);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ message: 'Method not allowed' });
}
