import dynamic from 'next/dynamic';
import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import MetricCard from '../components/MetricCard';
import prisma from '../lib/prisma';
import { getCookieToken, verifyToken } from '../lib/auth';

const AnalyticsCharts = dynamic(() => import('../components/AnalyticsCharts'), { ssr: false });

type DayData      = { date: string; spend: number; impressions: number; clicks: number; };
type PlatformData = { platform: string; spend: number; impressions: number; clicks: number; conversions: number; };
type ClientData   = { client: string; spend: number; installs: number; };
type MonthData    = {
  month: string; yr: number; mo: number; actualDate: string;
  spend: number; installs: number; conversions: number; cpr: number; platform: string;
};
type Metrics = {
  totalSpend: number; totalImpressions: number; totalClicks: number;
  totalConversions: number; totalInstalls: number; totalInAppActions: number; totalViews: number;
};
type AnalyticsProps = {
  userName: string;
  current7D: DayData[]; previous7D: DayData[];
  platformData: PlatformData[]; clientData: ClientData[];
  monthData: MonthData[]; metrics: Metrics;
  appliedStartDate: string; appliedEndDate: string;
  appliedPlatform: string; appliedClient: string;
  appliedProduct: string; appliedSelectedMonth: string;
  allClients: string[]; allPlatforms: string[]; allProducts: string[];
};

function FilterDropdown({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const isActive = value && !value.startsWith('All');
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition
          ${isActive ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:bg-slate-50'}`}>
        <span className={`text-xs font-medium ${isActive ? 'text-brand-500' : 'text-slate-400'}`}>{label}</span>
        <span className="font-semibold max-w-[120px] truncate">{value || 'All'}</span>
        <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setSearch(''); }} />
          <div className="absolute top-full mt-1 left-0 z-20 w-56 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" autoFocus />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? <p className="px-3 py-2 text-xs text-slate-400">No results</p>
                : filtered.map(opt => (
                  <button key={opt} onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-50 hover:text-brand-700 transition ${value === opt ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DateRangePicker({ startDate, endDate, onApply }: {
  startDate: string; endDate: string; onApply: (s: string, e: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const isActive = !!(startDate && endDate);
  const label = isActive ? `${startDate} → ${endDate}` : 'All time';
  const applyPreset = (days: number) => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    setTempStart(start); setTempEnd(end);
  };
  return (
    <div className="relative">
      <button onClick={() => { setTempStart(startDate); setTempEnd(endDate); setOpen(!open); }}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition
          ${isActive ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:bg-slate-50'}`}>
        <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={`text-xs font-medium ${isActive ? 'text-brand-500' : 'text-slate-400'}`}>Range</span>
        <span className="font-semibold max-w-[180px] truncate">{label}</span>
        <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 w-72 rounded-2xl border border-slate-200 bg-white shadow-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Select Date Range</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
                <input type="date" value={tempStart} onChange={e => setTempStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">End Date</label>
                <input type="date" value={tempEnd} onChange={e => setTempEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[{ label: 'Last 7d', days: 7 }, { label: 'Last 30d', days: 30 }, { label: 'Last 90d', days: 90 }].map(p => (
                  <button key={p.label} onClick={() => applyPreset(p.days)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition">
                    {p.label}
                  </button>
                ))}
              </div>
              {tempStart && tempEnd && tempStart > tempEnd && <p className="text-xs text-red-500">⚠ Start must be before end date</p>}
              <div className="flex gap-2">
                <button onClick={() => { onApply('', ''); setOpen(false); }}
                  className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition">Clear</button>
                <button onClick={() => { onApply(tempStart, tempEnd); setOpen(false); }}
                  disabled={!!(tempStart && tempEnd && tempStart > tempEnd)}
                  className="flex-1 rounded-lg bg-brand-600 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition disabled:opacity-40">Apply</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage({
  userName, current7D, previous7D, platformData, clientData, monthData, metrics,
  appliedStartDate, appliedEndDate, appliedPlatform, appliedClient,
  appliedProduct, appliedSelectedMonth, allClients, allPlatforms, allProducts,
}: AnalyticsProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    const done = () => setNavigating(false);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);
    return () => { router.events.off('routeChangeComplete', done); router.events.off('routeChangeError', done); };
  }, [router]);

  const applyFilters = (overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    const client        = overrides.client        ?? appliedClient;
    const platform      = overrides.platform      ?? appliedPlatform;
    const product       = overrides.product       ?? appliedProduct;
    const start         = overrides.start         ?? appliedStartDate;
    const end           = overrides.end           ?? appliedEndDate;
    const selectedMonth = overrides.selectedMonth ?? appliedSelectedMonth;
    if (client   && !client.startsWith('All'))   params.set('client',    client);
    if (platform && !platform.startsWith('All')) params.set('platform',  platform);
    if (product  && !product.startsWith('All'))  params.set('product',   product);
    if (start)  params.set('startDate',     start);
    if (end)    params.set('endDate',       end);
    if (selectedMonth) params.set('selectedMonth', selectedMonth);
    setNavigating(true);
    router.push(params.toString() ? `/analytics?${params.toString()}` : '/analytics');
  };

  const resetFilters = () => { setNavigating(true); router.push('/analytics'); };
  const hasFilters = !!appliedClient || !!appliedPlatform || !!appliedProduct || !!appliedStartDate || !!appliedEndDate;

  return (
    <div className="min-h-screen bg-slate-50">
      {navigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-xl border border-slate-100">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-100 border-t-brand-500" />
            <p className="text-sm font-semibold text-slate-700">Applying filters...</p>
          </div>
        </div>
      )}

      <Navbar searchValue="" onSearchChange={() => {}} onExport={() => {}} userName={userName} />

      <div className="bg-white border-b border-slate-200 px-4 py-3 lg:px-8">
        <div className="mx-auto max-w-[1600px] flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 mr-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
          </div>
          <FilterDropdown label="Client"   value={appliedClient   || 'All clients'}   options={['All clients',   ...allClients]}   onChange={v => applyFilters({ client: v })}   />
          <FilterDropdown label="Product"  value={appliedProduct  || 'All products'}  options={['All products',  ...allProducts]}  onChange={v => applyFilters({ product: v })}  />
          <FilterDropdown label="Platform" value={appliedPlatform || 'All platforms'} options={['All platforms', ...allPlatforms]} onChange={v => applyFilters({ platform: v })} />
          <DateRangePicker
            startDate={appliedStartDate || ''}
            endDate={appliedEndDate || ''}
            onApply={(s, e) => applyFilters({ start: s, end: e, selectedMonth: '' })}
          />
          {hasFilters && (
            <button onClick={resetFilters}
              className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100 transition">
              ✕ Reset
            </button>
          )}
          {appliedStartDate && appliedEndDate && (
            <span className="ml-auto rounded-full bg-brand-50 border border-brand-200 text-brand-600 px-2.5 py-1 text-xs font-medium">
              📅 {appliedStartDate} → {appliedEndDate}
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard title="Total Spend"  value={metrics.totalSpend}        trend={5.0}  />
            <MetricCard title="Impressions"  value={metrics.totalImpressions}  trend={1.2}  />
            <MetricCard title="Clicks"       value={metrics.totalClicks}       trend={4.4}  />
            <MetricCard title="App Installs" value={metrics.totalInstalls}     trend={-2.0} />
            <MetricCard title="Engagement"   value={metrics.totalInAppActions} trend={6.2}  />
            <MetricCard title="Conversions"  value={metrics.totalConversions}  trend={11.4} />
          </div>
          <AnalyticsCharts
            current7D={current7D} previous7D={previous7D}
            platformData={platformData} clientData={clientData}
            monthData={monthData}
            appliedPlatform={appliedPlatform} appliedClient={appliedClient}
            appliedSelectedMonth={appliedSelectedMonth}
            onMonthSelect={(month) => applyFilters({ selectedMonth: month || '' })}
          />
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, query }: any) => {
  const token = getCookieToken(req as any);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return { redirect: { destination: '/', permanent: false } };

  const startDate     = (query.startDate     as string) || '';
  const endDate       = (query.endDate       as string) || '';
  const platform      = (query.platform      as string) || '';
  const client        = (query.client        as string) || '';
  const product       = (query.product       as string) || '';
  const selectedMonth = (query.selectedMonth as string) || '';

  const conditions: string[] = [];
  if (startDate && endDate) conditions.push(`CONVERT(DATE, [Date]) >= '${startDate}' AND CONVERT(DATE, [Date]) <= '${endDate}'`);
  if (platform)             conditions.push(`[Platform] = '${platform.replace(/'/g, "''")}'`);
  if (client)               conditions.push(`[Account Name] = '${client.replace(/'/g, "''")}'`);
  if (product)              conditions.push(`[Product Name] = '${product.replace(/'/g, "''")}'`);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const andClause   = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

  try {
    const [
      metricsResult, current7D, previous7D, platformData,
      clientData, monthData, distinctClients, distinctPlatforms, distinctProducts,
    ] = await Promise.all([

      prisma.$queryRawUnsafe(`
        SELECT
          ISNULL(SUM(CAST([Spend]          AS DECIMAL(18,2))), 0) AS totalSpend,
          ISNULL(SUM(CAST([Conversions]    AS DECIMAL(18,2))), 0) AS totalConversions,
          ISNULL(SUM(CAST([Clicks]         AS DECIMAL(18,0))), 0) AS totalClicks,
          ISNULL(SUM(CAST([Impressions]    AS DECIMAL(18,0))), 0) AS totalImpressions,
          ISNULL(SUM(CAST([Installs]       AS DECIMAL(18,0))), 0) AS totalInstalls,
          ISNULL(SUM(CAST([In_App_actions] AS DECIMAL(18,0))), 0) AS totalInAppActions,
          ISNULL(SUM(CAST([Views]          AS DECIMAL(18,0))), 0) AS totalViews
        FROM [Campaign Data].[dbo].[Jazz_GSM_view] ${whereClause}
      `) as Promise<any[]>,

      prisma.$queryRawUnsafe(`
        SELECT CONVERT(NVARCHAR(10), [Date], 120) as date,
          ISNULL(SUM(CAST([Spend] AS FLOAT)), 0) as spend,
          ISNULL(SUM(CAST([Impressions] AS BIGINT)), 0) as impressions,
          ISNULL(SUM(CAST([Clicks] AS BIGINT)), 0) as clicks
        FROM [Campaign Data].[dbo].[Jazz_GSM_view]
        WHERE CONVERT(DATE, [Date]) >= DATEADD(DAY, -7, CAST(GETDATE() AS DATE))
          AND CONVERT(DATE, [Date]) < CAST(GETDATE() AS DATE) ${andClause}
        GROUP BY CONVERT(NVARCHAR(10), [Date], 120) ORDER BY date ASC
      `) as Promise<any[]>,

      prisma.$queryRawUnsafe(`
        SELECT CONVERT(NVARCHAR(10), [Date], 120) as date,
          ISNULL(SUM(CAST([Spend] AS FLOAT)), 0) as spend,
          ISNULL(SUM(CAST([Impressions] AS BIGINT)), 0) as impressions,
          ISNULL(SUM(CAST([Clicks] AS BIGINT)), 0) as clicks
        FROM [Campaign Data].[dbo].[Jazz_GSM_view]
        WHERE CONVERT(DATE, [Date]) >= DATEADD(DAY, -14, CAST(GETDATE() AS DATE))
          AND CONVERT(DATE, [Date]) < DATEADD(DAY, -7, CAST(GETDATE() AS DATE)) ${andClause}
        GROUP BY CONVERT(NVARCHAR(10), [Date], 120) ORDER BY date ASC
      `) as Promise<any[]>,

      prisma.$queryRawUnsafe(`
        SELECT [Platform] as platform,
          ISNULL(SUM(CAST([Spend] AS FLOAT)), 0) as spend,
          ISNULL(SUM(CAST([Impressions] AS BIGINT)), 0) as impressions,
          ISNULL(SUM(CAST([Clicks] AS BIGINT)), 0) as clicks,
          ISNULL(SUM(CAST([Conversions] AS FLOAT)), 0) as conversions
        FROM [Campaign Data].[dbo].[Jazz_GSM_view]
        ${whereClause ? whereClause + ' AND [Platform] IS NOT NULL' : 'WHERE [Platform] IS NOT NULL'}
        GROUP BY [Platform] ORDER BY spend DESC
      `) as Promise<any[]>,

      prisma.$queryRawUnsafe(`
        SELECT TOP 10 [Account Name] as client,
          ISNULL(SUM(CAST([Spend] AS FLOAT)), 0) as spend,
          ISNULL(SUM(CAST([Installs] AS FLOAT)), 0) as installs
        FROM [Campaign Data].[dbo].[Jazz_GSM_view]
        ${whereClause ? whereClause + ' AND [Account Name] IS NOT NULL' : 'WHERE [Account Name] IS NOT NULL'}
        GROUP BY [Account Name] ORDER BY spend DESC
      `) as Promise<any[]>,

      prisma.$queryRawUnsafe(`
        SELECT
          FORMAT([Date], 'MMM yyyy') as month,
          DATEPART(YEAR, [Date]) as yr,
          DATEPART(MONTH, [Date]) as mo,
          CONVERT(NVARCHAR(10), [Date], 120) as actualDate,
          ISNULL([Platform], 'Unknown') as platform,
          ISNULL(SUM(CAST([Spend] AS FLOAT)), 0) as spend,
          ISNULL(SUM(CAST([Installs] AS FLOAT)), 0) as installs,
          ISNULL(SUM(CAST([Conversions] AS FLOAT)), 0) as conversions,
          CASE
            WHEN ISNULL(SUM(CAST([Conversions] AS FLOAT)), 0) > 0
            THEN ISNULL(SUM(CAST([Spend] AS FLOAT)), 0) / SUM(CAST([Conversions] AS FLOAT))
            ELSE 0
          END as cpr
        FROM [Campaign Data].[dbo].[Jazz_GSM_view]
        ${whereClause}
        GROUP BY
          FORMAT([Date], 'MMM yyyy'),
          DATEPART(YEAR, [Date]),
          DATEPART(MONTH, [Date]),
          CONVERT(NVARCHAR(10), [Date], 120),
          [Platform]
        ORDER BY yr ASC, mo ASC, actualDate ASC
      `) as Promise<any[]>,

      prisma.$queryRawUnsafe(`SELECT DISTINCT [Account Name] AS val FROM [Campaign Data].[dbo].[Jazz_GSM_view] WHERE [Account Name] IS NOT NULL ORDER BY val`) as Promise<any[]>,
      prisma.$queryRawUnsafe(`SELECT DISTINCT [Platform]     AS val FROM [Campaign Data].[dbo].[Jazz_GSM_view] WHERE [Platform]     IS NOT NULL ORDER BY val`) as Promise<any[]>,
      prisma.$queryRawUnsafe(`SELECT DISTINCT [Product Name] AS val FROM [Campaign Data].[dbo].[Jazz_GSM_view] WHERE [Product Name] IS NOT NULL ORDER BY val`) as Promise<any[]>,
    ]);

    const m = (metricsResult as any[])[0] ?? {};

    return {
      props: {
        userName:             payload.name,
        appliedStartDate:     startDate,
        appliedEndDate:       endDate,
        appliedPlatform:      platform,
        appliedClient:        client,
        appliedProduct:       product,
        appliedSelectedMonth: selectedMonth,
        allClients:   (distinctClients   as any[]).map(r => String(r.val || '')).filter(Boolean),
        allPlatforms: (distinctPlatforms as any[]).map(r => String(r.val || '')).filter(Boolean),
        allProducts:  (distinctProducts  as any[]).map(r => String(r.val || '')).filter(Boolean),
        metrics: {
          totalSpend:        Number(m.totalSpend)        || 0,
          totalConversions:  Number(m.totalConversions)  || 0,
          totalClicks:       Number(m.totalClicks)       || 0,
          totalImpressions:  Number(m.totalImpressions)  || 0,
          totalInstalls:     Number(m.totalInstalls)     || 0,
          totalInAppActions: Number(m.totalInAppActions) || 0,
          totalViews:        Number(m.totalViews)        || 0,
        },
        current7D:  (current7D  as any[]).map(r => ({ date: String(r.date||''), spend: Number(r.spend)||0, impressions: Number(r.impressions)||0, clicks: Number(r.clicks)||0 })),
        previous7D: (previous7D as any[]).map(r => ({ date: String(r.date||''), spend: Number(r.spend)||0, impressions: Number(r.impressions)||0, clicks: Number(r.clicks)||0 })),
        platformData: (platformData as any[]).map(r => ({ platform: String(r.platform||''), spend: Number(r.spend)||0, impressions: Number(r.impressions)||0, clicks: Number(r.clicks)||0, conversions: Number(r.conversions)||0 })),
        clientData: (clientData as any[]).map(r => ({ client: String(r.client||''), spend: Number(r.spend)||0, installs: Number(r.installs)||0 })),
        monthData: (monthData as any[]).map(r => ({
          month:       String(r.month       || ''),
          yr:          Number(r.yr)         || 0,
          mo:          Number(r.mo)         || 0,
          actualDate:  String(r.actualDate  || ''),
          platform:    String(r.platform    || ''),
          spend:       Number(r.spend)      || 0,
          installs:    Number(r.installs)   || 0,
          conversions: Number(r.conversions)|| 0,
          cpr:         Number(r.cpr)        || 0,
        })),
      },
    };
  } catch (error) {
    console.error('Analytics error:', error);
    return {
      props: {
        userName: payload.name,
        appliedStartDate: '', appliedEndDate: '', appliedPlatform: '', appliedClient: '',
        appliedProduct: '', appliedSelectedMonth: '',
        allClients: [], allPlatforms: [], allProducts: [],
        metrics: { totalSpend: 0, totalConversions: 0, totalClicks: 0, totalImpressions: 0, totalInstalls: 0, totalInAppActions: 0, totalViews: 0 },
        current7D: [], previous7D: [], platformData: [], clientData: [], monthData: [],
      },
    };
  }
};