import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../lib/auth';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookie = req.headers.cookie || '';
  const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('saas_dashboard_token='));
  const token = match ? match.split('=')[1] : null;
  const payload = token ? verifyToken(token) : null;

  if (!payload) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        CAST([Account_ID] AS NVARCHAR(50)) as Account_ID,
        [Account_Name],
        [Campaign],
        CONVERT(NVARCHAR(10), [Date], 120) as Date,
        CAST([Spend] AS FLOAT) as Spend,
        CAST([Clicks] AS BIGINT) as Clicks,
        CAST([CPC] AS FLOAT) as CPC,
        CAST([Impressions] AS BIGINT) as Impressions,
        CAST([CPM] AS FLOAT) as CPM,
        CAST([Conversions] AS FLOAT) as Conversions,
        CAST([Cost_Per_Conversion] AS FLOAT) as Cost_Per_Conversion,
        CAST([In_App_actions] AS FLOAT) as In_App_actions,
        CAST([Cost_Per_In_app_action] AS FLOAT) as Cost_Per_In_app_action,
        CAST([Installs] AS FLOAT) as Installs,
        CAST([CPI] AS FLOAT) as CPI,
        CAST([Views] AS BIGINT) as Views,
        CAST([CPV] AS FLOAT) as CPV,
        [Ad_group_Name],
        [Platform]
      FROM [Campaign Data].[dbo].[fact_valuation_jazz_cash]
      ORDER BY [Date] DESC
    `);

    return res.status(200).json({ rows });
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ message: 'Export failed' });
  }
}