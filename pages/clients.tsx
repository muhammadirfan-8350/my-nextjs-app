import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import prisma from '../lib/prisma';
import { getCookieToken, verifyToken } from '../lib/auth';

// ── Types ──────────────────────────────────────────────────────────────────────
type ReportRow = {
  Account_ID: string;
  Account_Name: string;
  Product_Name: string;
  Campaign: string;
  Date: string;
  Spend: number;
  Clicks: number;
  CPC: number;
  Impressions: number;
  CPM: number;
  Conversions: number;
  Cost_Per_Conversion: number;
  In_App_actions: number;
  Cost_Per_In_app_action: number;
  Installs: number;
  CPI: number;
  Views: number;
  CPV: number;
  Ad_group_Name: string;
  Platform: string;
};

type Metrics = {
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  totalInstalls: number;
  totalInAppActions: number;
  totalViews: number;
};

type ClientsProps = {
  userName: string;
  rows: ReportRow[];
  metrics: Metrics;
  totalRows: number;
  appliedStartDate: string;
  appliedEndDate: string;
  appliedPlatform: string;
  appliedClient: string;
  appliedProduct: string;
  appliedAdGroup: string;
  allClients: string[];
  allPlatforms: string[];
  allProducts: string[];
  allAdGroups: string[];
};

// ── Formatters ─────────────────────────────────────────────────────────────────
const fmtNum = (v: number) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
};
const fmtPKR = (v: number) => {
  if (v >= 1e9) return `PKR ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `PKR ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `PKR ${(v / 1e3).toFixed(1)}K`;
  return `PKR ${v.toFixed(2)}`;
};

// ── KPI Definitions ────────────────────────────────────────────────────────────
const KPI_DEFS = [
  { key: 'totalSpend',        label: 'Total Spend',   color: '#7C3AED', bg: 'bg-violet-600', format: fmtPKR },
  { key: 'totalClicks',       label: 'Clicks',        color: '#3B82F6', bg: 'bg-blue-600',   format: fmtNum  },
  { key: 'totalImpressions',  label: 'Impressions',   color: '#DC2626', bg: 'bg-red-600',    format: fmtNum  },
  { key: 'totalConversions',  label: 'Conversions',   color: '#16A34A', bg: 'bg-green-700',  format: fmtNum  },
  { key: 'totalInstalls',     label: 'Installs',      color: '#EA580C', bg: 'bg-orange-600', format: fmtNum  },
  { key: 'totalInAppActions', label: 'In-App Actions',color: '#4F46E5', bg: 'bg-indigo-600', format: fmtNum  },
];

// ── Column Definitions ─────────────────────────────────────────────────────────
type ColDef = {
  key: keyof ReportRow;
  label: string;
  width: string;
  numeric?: boolean;
  render?: (r: ReportRow) => React.ReactNode;
};

const PLATFORM_BADGE: Record<string, string> = {
  Google: 'bg-blue-50 text-blue-700 border-blue-200',
  Meta:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  TikTok: 'bg-pink-50 text-pink-700 border-pink-200',
};

const ALL_COLUMNS: ColDef[] = [
  { key: 'Account_ID',             label: 'Account ID',      width: 'min-w-[120px]' },
  { key: 'Account_Name',           label: 'Account Name',    width: 'min-w-[160px]' },
  { key: 'Product_Name',           label: 'Product',         width: 'min-w-[140px]' },
  { key: 'Campaign',               label: 'Campaign',        width: 'min-w-[280px]' },
  { key: 'Ad_group_Name',          label: 'Ad Group',        width: 'min-w-[180px]' },
  { key: 'Platform',               label: 'Platform',        width: 'min-w-[100px]', render: r => <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PLATFORM_BADGE[r.Platform] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{r.Platform}</span> },
  { key: 'Date',                   label: 'Date',            width: 'min-w-[110px]' },
  { key: 'Spend',                  label: 'Spend',           width: 'min-w-[120px]', numeric: true, render: r => <span className="font-semibold text-violet-700">{fmtPKR(r.Spend)}</span> },
  { key: 'Clicks',                 label: 'Clicks',          width: 'min-w-[90px]',  numeric: true, render: r => fmtNum(r.Clicks) },
  { key: 'CPC',                    label: 'Avg. CPC',        width: 'min-w-[100px]', numeric: true, render: r => `PKR ${r.CPC.toFixed(2)}` },
  { key: 'Impressions',            label: 'Impressions',     width: 'min-w-[120px]', numeric: true, render: r => fmtNum(r.Impressions) },
  { key: 'CPM',                    label: 'Avg. CPM',        width: 'min-w-[100px]', numeric: true, render: r => `PKR ${r.CPM.toFixed(2)}` },
  { key: 'Conversions',            label: 'Conversions',     width: 'min-w-[120px]', numeric: true, render: r => fmtNum(r.Conversions) },
  { key: 'Cost_Per_Conversion',    label: 'Cost / Conv.',    width: 'min-w-[120px]', numeric: true, render: r => `PKR ${r.Cost_Per_Conversion.toFixed(2)}` },
  { key: 'In_App_actions',         label: 'In-App Actions',  width: 'min-w-[130px]', numeric: true, render: r => fmtNum(r.In_App_actions) },
  { key: 'Cost_Per_In_app_action', label: 'Cost / In-App',   width: 'min-w-[130px]', numeric: true, render: r => `PKR ${r.Cost_Per_In_app_action.toFixed(2)}` },
  { key: 'Installs',               label: 'Installs',        width: 'min-w-[100px]', numeric: true, render: r => fmtNum(r.Installs) },
  { key: 'CPI',                    label: 'CPI',             width: 'min-w-[90px]',  numeric: true, render: r => `PKR ${r.CPI.toFixed(2)}` },
  { key: 'Views',                  label: 'Views',           width: 'min-w-[90px]',  numeric: true, render: r => fmtNum(r.Views) },
  { key: 'CPV',                    label: 'CPV',             width: 'min-w-[90px]',  numeric: true, render: r => `PKR ${r.CPV.toFixed(2)}` },
];

// Default visible columns (like Google Ads default)
const DEFAULT_VISIBLE = new Set([
  'Account_Name', 'Product_Name', 'Campaign', 'Ad_group_Name', 'Platform', 'Date',
  'Spend', 'Clicks', 'CPC', 'Impressions', 'Conversions',
]);

// ── Filter Dropdown ────────────────────────────────────────────────────────────
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
          <div className="absolute top-full mt-1 left-0 z-20 w-60 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" autoFocus />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0
                ? <p className="px-3 py-2 text-xs text-slate-400">No results</p>
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

// ── Date Range Picker ──────────────────────────────────────────────────────────
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
              {tempStart && tempEnd && tempStart > tempEnd && <p className="text-xs text-red-500">⚠ Start must be before end</p>}
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

// ── Column Picker Modal ────────────────────────────────────────────────────────
function ColumnPicker({ visible, onClose, onApply }: {
  visible: Set<string>; onClose: () => void; onApply: (s: Set<string>) => void;
}) {
  const [selected, setSelected] = useState(new Set(visible));
  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) { if (next.size > 1) next.delete(key); }
    else next.add(key);
    setSelected(next);
  };

  const groups = [
    { label: 'Dimensions', keys: ['Account_ID', 'Account_Name', 'Product_Name', 'Campaign', 'Ad_group_Name', 'Platform', 'Date'] },
    { label: 'Performance', keys: ['Spend', 'Clicks', 'CPC', 'Impressions', 'CPM'] },
    { label: 'Conversions', keys: ['Conversions', 'Cost_Per_Conversion', 'In_App_actions', 'Cost_Per_In_app_action'] },
    { label: 'Engagement', keys: ['Installs', 'CPI', 'Views', 'CPV'] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Select Columns</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {groups.map(g => (
            <div key={g.label} className="mb-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{g.label}</p>
              <div className="grid grid-cols-3 gap-2">
                {g.keys.map(key => {
                  const col = ALL_COLUMNS.find(c => c.key === key);
                  if (!col) return null;
                  const isSel = selected.has(key);
                  return (
                    <button key={key} onClick={() => toggle(key)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition
                        ${isSel ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50'}`}>
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${isSel ? 'bg-brand-500 border-brand-500' : 'border-slate-300'}`}>
                        {isSel && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      {col.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
          <button onClick={() => setSelected(new Set(ALL_COLUMNS.map(c => c.key)))}
            className="text-xs text-brand-600 hover:underline font-medium">Select all</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={() => { onApply(selected); onClose(); }}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition">Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
export default function ClientsPage({
  userName, rows, metrics, totalRows,
  appliedStartDate, appliedEndDate,
  appliedPlatform, appliedClient, appliedProduct, appliedAdGroup,
  allClients, allPlatforms, allProducts, allAdGroups,
}: ClientsProps) {
  const router = useRouter();
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [navigating, setNavigating]   = useState(false);
  const [exporting, setExporting]     = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(DEFAULT_VISIBLE);
  const [sortKey, setSortKey]         = useState<string | null>(null);
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');
  const pageSize = 50;

  useEffect(() => {
    const done = () => setNavigating(false);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);
    return () => { router.events.off('routeChangeComplete', done); router.events.off('routeChangeError', done); };
  }, [router]);

  const applyFilters = (overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    const client   = overrides.client   ?? appliedClient;
    const platform = overrides.platform ?? appliedPlatform;
    const product  = overrides.product  ?? appliedProduct;
    const adGroup  = overrides.adGroup  ?? appliedAdGroup;
    const start    = overrides.start    ?? appliedStartDate;
    const end      = overrides.end      ?? appliedEndDate;
    if (client   && !client.startsWith('All'))   params.set('client',   client);
    if (platform && !platform.startsWith('All')) params.set('platform', platform);
    if (product  && !product.startsWith('All'))  params.set('product',  product);
    if (adGroup  && !adGroup.startsWith('All'))  params.set('adGroup',  adGroup);
    if (start) params.set('startDate', start);
    if (end)   params.set('endDate',   end);
    setNavigating(true);
    router.push(params.toString() ? `/clients?${params.toString()}` : '/clients');
  };

  const resetFilters = () => { setSearch(''); setPage(1); setNavigating(true); router.push('/clients'); };
  const hasFilters = !!appliedClient || !!appliedPlatform || !!appliedProduct ||
    !!appliedAdGroup || !!appliedStartDate || !!appliedEndDate || !!search;

  // Sort
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Filter + sort
  const filteredRows = useMemo(() => {
    let result = rows;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.Campaign?.toLowerCase().includes(q) ||
        r.Account_Name?.toLowerCase().includes(q) ||
        r.Product_Name?.toLowerCase().includes(q) ||
        r.Ad_group_Name?.toLowerCase().includes(q)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = (a as any)[sortKey];
        const bv = (b as any)[sortKey];
        if (typeof av === 'number' && typeof bv === 'number')
          return sortDir === 'asc' ? av - bv : bv - av;
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return result;
  }, [rows, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const currentRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const activeCols = ALL_COLUMNS.filter(c => visibleCols.has(c.key));

  // Totals row
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    const numericKeys = ['Spend','Clicks','Impressions','Conversions','In_App_actions','Installs','Views'];
    numericKeys.forEach(k => {
      t[k] = filteredRows.reduce((s, r) => s + ((r as any)[k] || 0), 0);
    });
    t['CPC']                    = t['Clicks'] > 0 ? t['Spend'] / t['Clicks'] : 0;
    t['CPM']                    = t['Impressions'] > 0 ? (t['Spend'] / t['Impressions']) * 1000 : 0;
    t['Cost_Per_Conversion']    = t['Conversions'] > 0 ? t['Spend'] / t['Conversions'] : 0;
    t['Cost_Per_In_app_action'] = t['In_App_actions'] > 0 ? t['Spend'] / t['In_App_actions'] : 0;
    t['CPI']                    = t['Installs'] > 0 ? t['Spend'] / t['Installs'] : 0;
    t['CPV']                    = t['Views'] > 0 ? t['Spend'] / t['Views'] : 0;
    return t;
  }, [filteredRows]);

  // CSV Export
  const handleExport = () => {
    setExporting(true);
    try {
      const headers = activeCols.map(c => c.label);
      const csvRows = filteredRows.map(row =>
        activeCols.map(col => {
          const val = (row as any)[col.key];
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
          return val ?? '';
        })
      );
      // Add totals row
      const totalsRow = activeCols.map(col => {
        if (['Account_ID','Account_Name','Product_Name','Campaign','Ad_group_Name','Platform','Date'].includes(col.key)) {
          return col.key === 'Account_Name' ? 'TOTAL' : '';
        }
        return totals[col.key]?.toFixed(2) ?? '';
      });
      const csv = [headers, ...csvRows, totalsRow].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `custom-report-${Date.now()}.csv`;
      a.href = url; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
    finally { setExporting(false); }
  };

  const paginationPages = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end   = Math.min(totalPages, Math.max(start + 4, 5));
    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }, [page, totalPages]);

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

      {colPickerOpen && (
        <ColumnPicker
          visible={visibleCols}
          onClose={() => setColPickerOpen(false)}
          onApply={s => { setVisibleCols(s); setPage(1); }}
        />
      )}

      <Navbar searchValue={search} onSearchChange={v => { setSearch(v); setPage(1); }} onExport={handleExport} userName={userName} />

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 lg:px-8 sticky top-0 z-30">
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
          <FilterDropdown label="Ad Group" value={appliedAdGroup  || 'All ad groups'} options={['All ad groups', ...allAdGroups]}  onChange={v => applyFilters({ adGroup: v })}  />
          <DateRangePicker startDate={appliedStartDate || ''} endDate={appliedEndDate || ''} onApply={(s, e) => applyFilters({ start: s, end: e })} />
          {hasFilters && (
            <button onClick={resetFilters}
              className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100 transition">
              ✕ Reset
            </button>
          )}
          <div className="ml-auto flex items-center gap-2 text-xs">
            {appliedStartDate && appliedEndDate && (
              <span className="rounded-full bg-brand-50 border border-brand-200 text-brand-600 px-2.5 py-1 font-medium">
                📅 {appliedStartDate} → {appliedEndDate}
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              {filteredRows.length.toLocaleString()} rows
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[240px_1fr] lg:px-6">
        <Sidebar />
        <div className="space-y-5 min-w-0">

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Custom Report</h1>
              <p className="text-xs text-slate-400 mt-0.5">Campaign-level data from Jazz GSM view</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setColPickerOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Columns
                <span className="rounded-full bg-brand-100 text-brand-600 px-1.5 py-0.5 text-[10px] font-bold">{activeCols.length}</span>
              </button>
              <button onClick={handleExport} disabled={exporting}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition shadow-sm disabled:opacity-60">
                {exporting ? (
                  <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                Export CSV
              </button>
            </div>
          </div>

          {/* KPI Boxes */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {KPI_DEFS.map(kpi => (
              <div key={kpi.key} className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                <p className="text-lg font-bold tabular-nums text-slate-800">
                  {kpi.format((metrics as any)[kpi.key] || 0)}
                </p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-500">
                Showing <span className="text-slate-800">{Math.min((page-1)*pageSize+1, filteredRows.length)}–{Math.min(page*pageSize, filteredRows.length)}</span> of <span className="text-slate-800">{filteredRows.length.toLocaleString()}</span> rows
                {sortKey && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 text-brand-600 px-2 py-0.5 text-[10px] font-medium">
                    Sorted: {ALL_COLUMNS.find(c => c.key === sortKey)?.label} {sortDir === 'asc' ? '↑' : '↓'}
                    <button onClick={() => setSortKey(null)} className="hover:text-red-500 ml-0.5">✕</button>
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-400">{pageSize} rows per page</span>
            </div>

            {/* Scrollable Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {activeCols.map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)}
                        className={`${col.width} px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap select-none cursor-pointer hover:text-slate-800 hover:bg-slate-100 transition`}>
                        <div className="flex items-center gap-1">
                          {col.label}
                          <span className="inline-flex flex-col leading-none">
                            <span className={`text-[7px] ${sortKey === col.key && sortDir === 'asc' ? 'text-brand-600' : 'text-slate-300'}`}>▲</span>
                            <span className={`text-[7px] ${sortKey === col.key && sortDir === 'desc' ? 'text-brand-600' : 'text-slate-300'}`}>▼</span>
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentRows.length === 0 ? (
                    <tr><td colSpan={activeCols.length} className="px-4 py-16 text-center text-slate-300 text-sm">No data</td></tr>
                  ) : (
                    <>
                      {currentRows.map((row, i) => (
                        <tr key={`row-${i}`} className={`hover:bg-brand-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          {activeCols.map(col => (
                            <td key={col.key} className={`${col.width} px-4 py-2.5 whitespace-nowrap text-slate-700 text-xs ${col.numeric ? 'text-right tabular-nums' : ''}`}>
                              {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-slate-100 border-t-2 border-slate-200 font-bold">
                        {activeCols.map((col, idx) => {
                          const isDim = ['Account_ID','Account_Name','Product_Name','Campaign','Ad_group_Name','Platform','Date'].includes(col.key);
                          return (
                            <td key={col.key} className={`${col.width} px-4 py-2.5 whitespace-nowrap text-xs ${col.numeric ? 'text-right tabular-nums' : ''}`}>
                              {isDim
                                ? (idx === 0 ? <span className="text-slate-600 font-bold">TOTAL</span> : '')
                                : <span className="text-slate-800">{
                                    col.key === 'Spend' ? fmtPKR(totals[col.key] || 0) :
                                    col.key === 'Clicks' || col.key === 'Impressions' || col.key === 'Conversions' || col.key === 'In_App_actions' || col.key === 'Installs' || col.key === 'Views'
                                      ? fmtNum(totals[col.key] || 0)
                                      : `PKR ${(totals[col.key] || 0).toFixed(2)}`
                                  }</span>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs text-slate-500">
                  Page <span className="font-semibold text-slate-700">{page}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(1)} disabled={page === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30 text-xs">«</button>
                  <button onClick={() => setPage(page - 1)} disabled={page === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {paginationPages.map(p => (
                    <button key={`pg-${p}`} onClick={() => setPage(p)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition
                        ${page === p ? 'bg-brand-600 text-white border border-brand-600' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(page + 1)} disabled={page === totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30 text-xs">»</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── getServerSideProps ─────────────────────────────────────────────────────────
export const getServerSideProps: GetServerSideProps = async ({ req, query }: any) => {
  const token = getCookieToken(req as any);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return { redirect: { destination: '/', permanent: false } };

  const startDate = (query.startDate as string) || '';
  const endDate   = (query.endDate   as string) || '';
  const platform  = (query.platform  as string) || '';
  const client    = (query.client    as string) || '';
  const product   = (query.product   as string) || '';
  const adGroup   = (query.adGroup   as string) || '';

  const conditions: string[] = [];
  if (startDate && endDate) conditions.push(`CONVERT(DATE, [Date]) >= '${startDate}' AND CONVERT(DATE, [Date]) <= '${endDate}'`);
  if (platform)             conditions.push(`[Platform] = '${platform.replace(/'/g, "''")}'`);
  if (client)               conditions.push(`[Account Name] = '${client.replace(/'/g, "''")}'`);
  if (product)              conditions.push(`[Product Name] = '${product.replace(/'/g, "''")}'`);
  if (adGroup)              conditions.push(`[Ad_group_Name] = '${adGroup.replace(/'/g, "''")}'`);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRows, metricsResult, dc, dp, dprod, da] = await Promise.all([

      prisma.$queryRawUnsafe(`
        SELECT TOP 2000
          CAST([Account_ID]             AS NVARCHAR(50))  AS Account_ID,
          [Account Name]                                   AS Account_Name,
          [Product Name]                                   AS Product_Name,
          [Campaign],
          CONVERT(NVARCHAR(10), [Date], 120)               AS Date,
          CAST([Spend]                  AS FLOAT)          AS Spend,
          CAST([Clicks]                 AS BIGINT)         AS Clicks,
          CAST([CPC]                    AS FLOAT)          AS CPC,
          CAST([Impressions]            AS BIGINT)         AS Impressions,
          CAST([CPM]                    AS FLOAT)          AS CPM,
          CAST([Conversions]            AS FLOAT)          AS Conversions,
          CAST([Cost_Per_Conversion]    AS FLOAT)          AS Cost_Per_Conversion,
          CAST([In_App_actions]         AS FLOAT)          AS In_App_actions,
          CAST([Cost_Per_In_app_action] AS FLOAT)          AS Cost_Per_In_app_action,
          CAST([Installs]               AS FLOAT)          AS Installs,
          CAST([CPI]                    AS FLOAT)          AS CPI,
          CAST([Views]                  AS BIGINT)         AS Views,
          CAST([CPV]                    AS FLOAT)          AS CPV,
          [Ad_group_Name],
          [Platform]
        FROM [Campaign Data].[dbo].[Jazz_GSM_view]
        ${whereClause}
        ORDER BY [Date] DESC, [Spend] DESC
      `) as Promise<any[]>,

      prisma.$queryRawUnsafe(`
        SELECT
          ISNULL(SUM(CAST([Spend]          AS DECIMAL(18,2))), 0) AS totalSpend,
          ISNULL(SUM(CAST([Clicks]         AS DECIMAL(18,0))), 0) AS totalClicks,
          ISNULL(SUM(CAST([Impressions]    AS DECIMAL(18,0))), 0) AS totalImpressions,
          ISNULL(SUM(CAST([Conversions]    AS DECIMAL(18,2))), 0) AS totalConversions,
          ISNULL(SUM(CAST([Installs]       AS DECIMAL(18,0))), 0) AS totalInstalls,
          ISNULL(SUM(CAST([In_App_actions] AS DECIMAL(18,0))), 0) AS totalInAppActions,
          ISNULL(SUM(CAST([Views]          AS DECIMAL(18,0))), 0) AS totalViews
        FROM [Campaign Data].[dbo].[Jazz_GSM_view] ${whereClause}
      `) as Promise<any[]>,

      prisma.$queryRawUnsafe(`SELECT DISTINCT [Account Name] AS val FROM [Campaign Data].[dbo].[Jazz_GSM_view] WHERE [Account Name] IS NOT NULL ORDER BY val`) as Promise<any[]>,
      prisma.$queryRawUnsafe(`SELECT DISTINCT [Platform]     AS val FROM [Campaign Data].[dbo].[Jazz_GSM_view] WHERE [Platform]     IS NOT NULL ORDER BY val`) as Promise<any[]>,
      prisma.$queryRawUnsafe(`SELECT DISTINCT [Product Name] AS val FROM [Campaign Data].[dbo].[Jazz_GSM_view] WHERE [Product Name] IS NOT NULL ORDER BY val`) as Promise<any[]>,
      prisma.$queryRawUnsafe(`SELECT DISTINCT [Ad_group_Name] AS val FROM [Campaign Data].[dbo].[Jazz_GSM_view] WHERE [Ad_group_Name] IS NOT NULL ORDER BY val`) as Promise<any[]>,
    ]);

    const m = (metricsResult as any[])[0] ?? {};

    return {
      props: {
        userName:          payload.name,
        appliedStartDate:  startDate,
        appliedEndDate:    endDate,
        appliedPlatform:   platform,
        appliedClient:     client,
        appliedProduct:    product,
        appliedAdGroup:    adGroup,
        allClients:   (dc    as any[]).map(r => String(r.val || '')).filter(Boolean),
        allPlatforms: (dp    as any[]).map(r => String(r.val || '')).filter(Boolean),
        allProducts:  (dprod as any[]).map(r => String(r.val || '')).filter(Boolean),
        allAdGroups:  (da    as any[]).map(r => String(r.val || '')).filter(Boolean),
        totalRows: (dataRows as any[]).length,
        metrics: {
          totalSpend:        Number(m.totalSpend)        || 0,
          totalClicks:       Number(m.totalClicks)       || 0,
          totalImpressions:  Number(m.totalImpressions)  || 0,
          totalConversions:  Number(m.totalConversions)  || 0,
          totalInstalls:     Number(m.totalInstalls)     || 0,
          totalInAppActions: Number(m.totalInAppActions) || 0,
          totalViews:        Number(m.totalViews)        || 0,
        },
        rows: (dataRows as any[]).map(r => ({
          Account_ID:             String(r.Account_ID             || ''),
          Account_Name:           String(r.Account_Name           || ''),
          Product_Name:           String(r.Product_Name           || ''),
          Campaign:               String(r.Campaign               || ''),
          Date:                   String(r.Date                   || ''),
          Spend:                  Number(r.Spend)                 || 0,
          Clicks:                 Number(r.Clicks)                || 0,
          CPC:                    Number(r.CPC)                   || 0,
          Impressions:            Number(r.Impressions)           || 0,
          CPM:                    Number(r.CPM)                   || 0,
          Conversions:            Number(r.Conversions)           || 0,
          Cost_Per_Conversion:    Number(r.Cost_Per_Conversion)   || 0,
          In_App_actions:         Number(r.In_App_actions)        || 0,
          Cost_Per_In_app_action: Number(r.Cost_Per_In_app_action)|| 0,
          Installs:               Number(r.Installs)              || 0,
          CPI:                    Number(r.CPI)                   || 0,
          Views:                  Number(r.Views)                 || 0,
          CPV:                    Number(r.CPV)                   || 0,
          Ad_group_Name:          String(r.Ad_group_Name          || ''),
          Platform:               String(r.Platform               || ''),
        })),
      },
    };
  } catch (error) {
    console.error('Clients page error:', error);
    return {
      props: {
        userName: payload.name,
        appliedStartDate: '', appliedEndDate: '', appliedPlatform: '', appliedClient: '',
        appliedProduct: '', appliedAdGroup: '',
        allClients: [], allPlatforms: [], allProducts: [], allAdGroups: [],
        totalRows: 0,
        metrics: { totalSpend: 0, totalClicks: 0, totalImpressions: 0, totalConversions: 0, totalInstalls: 0, totalInAppActions: 0, totalViews: 0 },
        rows: [],
      },
    };
  }
};