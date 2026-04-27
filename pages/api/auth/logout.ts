import { NextApiRequest, NextApiResponse } from 'next';
import { clearAuthCookie } from '../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Set-Cookie', clearAuthCookie());
  res.writeHead(302, { Location: '/' });
  res.end();
}
