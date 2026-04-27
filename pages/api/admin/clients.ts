import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } });
    return res.status(200).json(clients);
  }

  if (req.method === 'POST') {
    const { name, industry, status } = req.body;
    if (!name || !industry) {
      return res.status(400).json({ message: 'Name and industry are required' });
    }

    const client = await prisma.client.create({
      data: { name, industry, status: status || 'Active' },
    });
    return res.status(201).json(client);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ message: 'Method not allowed' });
}
