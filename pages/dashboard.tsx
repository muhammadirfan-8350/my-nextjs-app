import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { verifyToken } from '../lib/auth';
import prisma from '../lib/prisma';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import dynamic from 'next/dynamic';

const DynamicChart = dynamic(() => import('../components/DashboardChart'), { ssr: false });

type CampaignRow = {
  Account_ID: string; Account_Name: string; Product_Name: string; Campaign: string; Date: string;
  Spend: number; Clicks: number; CPC: number; Impressions: number; CPM: number;
  Conversions: number; Cost_Per_Conversion: number; In_App_actions: number;
  Cost_Per_In_app_action: number; Installs: number; CPI: number;
  Views: number; CPV: number; Ad_group_Name: string; Platform: string;
};
type Metrics = {
  totalSpend: number; totalConversions: number; totalClicks: number;
  totalImpressions: number; totalInstalls: number; totalInAppActions: number; totalViews: number;
};
type ChartDataPoint = {
  date: string; Spend: number; Clicks: number; Impressions: number; Conversions: number;
  CPC: number; CPM: number; Installs: number; InAppActions: number; Views: number;
  Cost_Per_Conversion: number;
};
type DashboardProps = {
  userName: string; campaignRows: CampaignRow[]; metrics: Metrics;
  chartData: ChartDataPoint[];
  appliedStartDate: string; appliedEndDate: string;
  appliedPlatform: string; appliedClient: string;
  appliedAdGroup: string; appliedAccount: string; appliedProduct: string;
  allClients: string[]; allPlatforms: string[]; allAdGroups: string[];
  allAccounts: string[]; allProducts: string[];
};
export type MetricDef = {
  key: string; label: string; shortLabel: string;
  color: string; bgColor: string;
  format: (v: number) => string;
  category: 'Performance' | 'Conversions' | 'Engagement';
};

const fmtNum = (v: number) => {
  if (v >= 1e9) return `${(v/1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v/1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v/1e3).toFixed(1)}K`;
  return v.toLocaleString();
};
const fmtPKR = (v: number) => {
  if (v >= 1e9) return `PKR ${(v/1e9).toFixed(1)}B`;
  if (v >= 1e6) return `PKR ${(v/1e6).toFixed(1)}M`;
  if (v >= 1e3) return `PKR ${(v/1e3).toFixed(1)}K`;
  return `PKR ${v.toFixed(2)}`;
};

export const METRIC_DEFS: MetricDef[] = [
  { key: 'Clicks',              label: 'Clicks',         shortLabel: 'Clicks',   color: '#3B82F6', bgColor: 'bg-blue-600',   format: fmtNum,                     category: 'Performance'  },
  { key: 'Impressions',         label: 'Impressions',    shortLabel: 'Impress.', color: '#DC2626', bgColor: 'bg-red-600',    format: fmtNum,                     category: 'Performance'  },
  { key: 'CPC',                 label: 'Avg. CPC',       shortLabel: 'Avg. CPC', color: '#D97706', bgColor: 'bg-amber-500',  format: v => `PKR ${v.toFixed(2)}`, category: 'Performance'  },
  { key: 'Spend',               label: 'Cost',           shortLabel: 'Cost',     color: '#7C3AED', bgColor: 'bg-violet-600', format: fmtPKR,                     category: 'Performance'  },
  { key: 'CPM',                 label: 'Avg. CPM',       shortLabel: 'CPM',      color: '#0891B2', bgColor: 'bg-cyan-600',   format: v => `PKR ${v.toFixed(2)}`, category: 'Performance'  },
  { key: 'Conversions',         label: 'Conversions',    shortLabel: 'Conv.',    color: '#16A34A', bgColor: 'bg-green-700',  format: fmtNum,                     category: 'Conversions'  },
  { key: 'Cost_Per_Conversion', label: 'Cost / conv.',   shortLabel: 'CPA',      color: '#BE185D', bgColor: 'bg-pink-700',   format: fmtPKR,                     category: 'Conversions'  },
  { key: 'Installs',            label: 'Installs',       shortLabel: 'Installs', color: '#EA580C', bgColor: 'bg-orange-600', format: fmtNum,                     category: 'Engagement'   },
  { key: 'InAppActions',        label: 'In-App Actions', shortLabel: 'In-App',   color: '#4F46E5', bgColor: 'bg-indigo-600', format: fmtNum,                     category: 'Engagement'   },
  { key: 'Views',               label: 'Views',          shortLabel: 'Views',    color: '#0F766E', bgColor: 'bg-teal-700',   format: fmtNum,                     category: 'Engagement'   },
];

const PLATFORM_BADGE: Record<string, string> = {
  Google: 'bg-blue-50 text-blue-700 border-blue-200',
  Meta:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  TikTok: 'bg-pink-50 text-pink-700 border-pink-200',
};

type ColDef = { key: string; label: string; width: string; render?: (r: CampaignRow) => React.ReactNode; numeric?: boolean; };
const COLUMNS: ColDef[] = [
  { key: 'Account_Name',        label: 'Account Name',  width: 'min-w-[160px]' },
  { key: 'Product_Name',        label: 'Product',       width: 'min-w-[140px]' },
  { key: 'Campaign',            label: 'Campaign',      width: 'min-w-[260px]' },
  { key: 'Platform',            label: 'Platform',      width: 'min-w-[90px]',  render: r => <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PLATFORM_BADGE[r.Platform] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{r.Platform}</span> },
  { key: 'Date',                label: 'Date',          width: 'min-w-[100px]' },
  { key: 'Spend',               label: 'Spend',         width: 'min-w-[110px]', numeric: true, render: r => <span className="font-semibold">{fmtPKR(r.Spend)}</span> },
  { key: 'Clicks',              label: 'Clicks',        width: 'min-w-[80px]',  numeric: true, render: r => fmtNum(r.Clicks) },
  { key: 'CPC',                 label: 'CPC',           width: 'min-w-[90px]',  numeric: true, render: r => `PKR ${r.CPC.toFixed(2)}` },
  { key: 'Impressions',         label: 'Impressions',   width: 'min-w-[110px]', numeric: true, render: r => fmtNum(r.Impressions) },
  { key: 'CPM',                 label: 'CPM',           width: 'min-w-[90px]',  numeric: true, render: r => `PKR ${r.CPM.toFixed(2)}` },
  { key: 'Conversions',         label: 'Conversions',   width: 'min-w-[110px]', numeric: true, render: r => fmtNum(r.Conversions) },
  { key: 'Cost_Per_Conversion', label: 'CPA',           width: 'min-w-[90px]',  numeric: true, render: r => `PKR ${r.Cost_Per_Conversion.toFixed(2)}` },
  { key: 'In_App_actions',      label: 'In-App',        width: 'min-w-[90px]',  numeric: true, render: r => fmtNum(r.In_App_actions) },
  { key: 'Installs',            label: 'Installs',      width: 'min-w-[90px]',  numeric: true, render: r => fmtNum(r.Installs) },
  { key: 'CPI',                 label: 'CPI',           width: 'min-w-[90px]',  numeric: true, render: r => `PKR ${r.CPI.toFixed(2)}` },
  { key: 'Views',               label: 'Views',         width: 'min-w-[90px]',  numeric: true, render: r => fmtNum(r.Views) },
  { key: 'CPV',                 label: 'CPV',           width: 'min-w-[90px]',  numeric: true, render: r => `PKR ${r.CPV.toFixed(2)}` },
  { key: 'Ad_group_Name',       label: 'Ad Group',      width: 'min-w-[160px]' },
];

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
          <div className="absolute top-full mt-1 left-0 z-20 w-56 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" autoFocus />
            </div>
            <div className="max-h-48 overflow-y-auto">
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

// ── Metric Selector ────────────────────────────────────────────────────────────
function MetricSelector({ current, onSelect, isBoxActive }: {
  current: MetricDef; onSelect: (m: MetricDef) => void; isBoxActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const categories = ['Performance', 'Conversions', 'Engagement'] as const;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    setOpen(o => !o);
  };

  return (
    <div className="relative inline-flex" ref={ref}>
      <div onMouseDown={e => e.stopPropagation()} onClick={handleOpen}
        className={`inline-flex items-center justify-center w-5 h-5 rounded cursor-pointer transition
          ${isBoxActive ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z" /></svg>
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setOpen(false); }} />
          <div className="fixed z-[9999] w-52 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
            onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Metric</p>
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {categories.map(cat => (
                <div key={cat}>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{cat}</p>
                  {METRIC_DEFS.filter(m => m.category === cat).map(m => (
                    <div key={m.key} onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); onSelect(m); setOpen(false); }}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 transition
                        ${current.key === m.key ? 'bg-slate-50 font-semibold text-slate-800' : 'text-slate-600'}`}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                      {m.label}
                      {current.key === m.key && (
                        <svg className="w-3 h-3 text-brand-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Modify Metrics Modal ───────────────────────────────────────────────────────
function ModifyMetricsModal({ selectedMetrics, onClose, onApply }: {
  selectedMetrics: MetricDef[]; onClose: () => void; onApply: (m: MetricDef[]) => void;
}) {
  const [selected, setSelected] = useState<MetricDef[]>(selectedMetrics);
  const categories = ['Performance', 'Conversions', 'Engagement'] as const;
  const toggle = (m: MetricDef) => {
    if (selected.find(s => s.key === m.key)) {
      if (selected.length > 1) setSelected(selected.filter(s => s.key !== m.key));
    } else {
      if (selected.length < 4) setSelected([...selected, m]);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Modify metrics</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex" style={{ height: 420 }}>
          <div className="flex-1 overflow-y-auto p-5 border-r border-slate-100">
            <p className="text-sm font-semibold text-slate-700 mb-4">Select metrics to add to the graph</p>
            {categories.map(cat => (
              <div key={cat} className="mb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{cat}</p>
                <div className="grid grid-cols-3 gap-2">
                  {METRIC_DEFS.filter(m => m.category === cat).map(m => {
                    const isSel = !!selected.find(s => s.key === m.key);
                    const isDisabled = !isSel && selected.length >= 4;
                    return (
                      <button key={m.key} onClick={() => toggle(m)} disabled={isDisabled}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition
                          ${isSel ? 'border-brand-300 bg-brand-50 text-brand-700' : isDisabled ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50'}`}>
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition
                          ${isSel ? 'bg-brand-500 border-brand-500' : 'border-slate-300'}`}>
                          {isSel && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </span>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="w-56 p-4 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Your columns</p>
            <p className="text-[10px] text-slate-400 mb-3">Max 4 metrics</p>
            <div className="space-y-1.5">
              {selected.map(m => (
                <div key={m.key} className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                  <span className="flex-1 text-xs font-medium text-slate-700 truncate">{m.label}</span>
                  <button onClick={() => { if (selected.length > 1) setSelected(selected.filter(s => s.key !== m.key)); }}
                    className="text-slate-300 hover:text-red-400 transition flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {Array.from({ length: 4 - selected.length }).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center rounded-lg border border-dashed border-slate-200 px-3 py-2">
                  <span className="text-[11px] text-slate-300">Empty slot</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-100">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={() => { onApply(selected); onClose(); }}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition">Apply</button>
        </div>
      </div>
    </div>
  );
}

// ── KPI Chart 3-dot Menu ───────────────────────────────────────────────────────
function KpiChartMenu({ chartData, activeMetrics }: {
  chartData: ChartDataPoint[]; activeMetrics: MetricDef[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const exportCSV = () => {
    if (!chartData.length || !activeMetrics.length) return;
    const headers = ['Date', ...activeMetrics.map(m => m.label)];
    const rows = chartData.map(d => [d.date, ...activeMetrics.map(m => String((d as any)[m.key] || 0))]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `chart-data-${Date.now()}.csv`;
    a.href = url; a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-300 hover:text-slate-500">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-slate-100 bg-white shadow-lg overflow-hidden">
            <button onClick={exportCSV}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export data
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── KPI Box ────────────────────────────────────────────────────────────────────
function KpiBox({ metric, value, isSelected, onToggle, onMetricChange }: {
  metric: MetricDef; value: number; isSelected: boolean;
  onToggle: () => void; onMetricChange: (m: MetricDef) => void;
}) {
  return (
    <div onMouseDown={e => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-metric-arrow]')) onToggle();
    }}
      className={`relative flex-1 cursor-pointer select-none transition-colors border-r border-slate-200 last:border-r-0 min-w-0
        ${isSelected ? `${metric.bgColor} text-white` : 'bg-white text-slate-800 hover:bg-slate-50'}`}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-1 mb-1 min-w-0">
          <span className={`text-xs font-semibold truncate ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
            {metric.shortLabel}
          </span>
          <span data-metric-arrow="true">
            <MetricSelector current={metric} onSelect={onMetricChange} isBoxActive={isSelected} />
          </span>
        </div>
        <div className={`text-xl font-bold tabular-nums truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
          {metric.format(value)}
        </div>
      </div>
      {isSelected && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30" />}
    </div>
  );
}

// ── Smart Table ────────────────────────────────────────────────────────────────
function SmartTable({ rows, page, pageSize, total, onPageChange }: {
  rows: CampaignRow[]; page: number; pageSize: number; total: number; onPageChange: (p: number) => void;
}) {
  const [sortKey, setSortKey]         = useState<string | null>(null);
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('asc');
  const [hiddenCols, setHiddenCols]   = useState<Set<string>>(new Set());
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const totalPages = Math.ceil(total / pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = (a as any)[sortKey]; const bv = (b as any)[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [rows, sortKey, sortDir]);

  const visibleCols = COLUMNS.filter(c => !hiddenCols.has(c.key));

  const paginationPages = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end   = Math.min(totalPages, Math.max(start + 4, 5));
    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }, [page, totalPages]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            Showing <span className="text-slate-800">{((page-1)*pageSize)+1}–{Math.min(page*pageSize,total)}</span> of <span className="text-slate-800">{total.toLocaleString()}</span> rows
          </span>
          {sortKey && (
            <span className="flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 text-brand-600 px-2 py-0.5 text-[11px] font-medium">
              {COLUMNS.find(c => c.key === sortKey)?.label}
              <button onClick={() => setSortKey(null)} className="hover:text-red-500 ml-0.5">✕</button>
            </span>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setColMenuOpen(!colMenuOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Columns <span className="rounded-full bg-brand-100 text-brand-600 px-1.5 py-0.5 text-[10px] font-bold ml-1">{visibleCols.length}</span>
          </button>
          {colMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setColMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-52 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Toggle Columns</span>
                  <button onClick={() => setHiddenCols(new Set())} className="text-[10px] text-brand-600 hover:underline font-medium">Show all</button>
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  {COLUMNS.map(col => (
                    <button key={col.key}
                      onClick={() => { const next = new Set(hiddenCols); next.has(col.key) ? next.delete(col.key) : next.add(col.key); setHiddenCols(next); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition">
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${!hiddenCols.has(col.key) ? 'bg-brand-500 border-brand-500' : 'border-slate-300'}`}>
                        {!hiddenCols.has(col.key) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {visibleCols.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)}
                  className={`${col.width} px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap select-none cursor-pointer hover:text-slate-700 hover:bg-slate-100 transition`}>
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
            {sortedRows.length === 0
              ? <tr><td colSpan={visibleCols.length} className="px-4 py-16 text-center text-slate-400">No data</td></tr>
              : sortedRows.map((row, i) => (
                <tr key={`row-${i}`} className={`hover:bg-slate-50/80 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                  {visibleCols.map(col => (
                    <td key={col.key} className={`${col.width} px-4 py-3 whitespace-nowrap text-slate-700 ${col.numeric ? 'text-right tabular-nums' : ''}`}>
                      {col.render ? col.render(row) : String((row as any)[col.key] || '—')}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Page <span className="font-semibold text-slate-700">{page}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(1)} disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30 text-xs">«</button>
            <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            {paginationPages.map(p => (
              <button key={`pg-${p}`} onClick={() => onPageChange(p)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition
                  ${page === p ? 'bg-brand-600 text-white border border-brand-600' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30 text-xs">»</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
export default function DashboardPage({
  userName, campaignRows, metrics, chartData,
  appliedStartDate, appliedEndDate,
  appliedPlatform, appliedClient, appliedAdGroup, appliedAccount, appliedProduct,
  allClients, allPlatforms, allAdGroups, allAccounts, allProducts,
}: DashboardProps) {
  const router = useRouter();
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [exporting, setExporting]   = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const pageSize = 10;

  const defaultMetrics = [
    METRIC_DEFS.find(m => m.key === 'Clicks')!,
    METRIC_DEFS.find(m => m.key === 'Impressions')!,
    METRIC_DEFS.find(m => m.key === 'CPC')!,
    METRIC_DEFS.find(m => m.key === 'Conversions')!,
  ];

  const [kpiMetrics, setKpiMetrics] = useState<MetricDef[]>(defaultMetrics);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(defaultMetrics.map(m => m.key)));

  const toggleSelected = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else { next.add(key); }
      return next;
    });
  };

  const metricValues: Record<string, number> = {
    Spend:               metrics.totalSpend,
    Clicks:              metrics.totalClicks,
    Impressions:         metrics.totalImpressions,
    Conversions:         metrics.totalConversions,
    Installs:            metrics.totalInstalls,
    InAppActions:        metrics.totalInAppActions,
    Views:               metrics.totalViews,
    CPC:                 metrics.totalClicks > 0 ? metrics.totalSpend / metrics.totalClicks : 0,
    CPM:                 metrics.totalImpressions > 0 ? (metrics.totalSpend / metrics.totalImpressions) * 1000 : 0,
    Cost_Per_Conversion: metrics.totalConversions > 0 ? metrics.totalSpend / metrics.totalConversions : 0,
  };

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
    const adGroup  = overrides.adGroup  ?? appliedAdGroup;
    const account  = overrides.account  ?? appliedAccount;
    const product  = overrides.product  ?? appliedProduct;
    const start    = overrides.start    ?? appliedStartDate;
    const end      = overrides.end      ?? appliedEndDate;
    if (client   && !client.startsWith('All'))   params.set('client',    client);
    if (platform && !platform.startsWith('All')) params.set('platform',  platform);
    if (adGroup  && !adGroup.startsWith('All'))  params.set('adGroup',   adGroup);
    if (account  && !account.startsWith('All'))  params.set('account',   account);
    if (product  && !product.startsWith('All'))  params.set('product',   product);
    if (start) params.set('startDate', start);
    if (end)   params.set('endDate',   end);
    setNavigating(true);
    router.push(params.toString() ? `/dashboard?${params.toString()}` : '/dashboard');
  };

  const resetFilters = () => { setSearch(''); setPage(1); setNavigating(true); router.push('/dashboard'); };
  const hasFilters = !!appliedClient || !!appliedPlatform || !!appliedAdGroup ||
    !!appliedAccount || !!appliedProduct || !!appliedStartDate || !!appliedEndDate || !!search;

  const filteredRows = useMemo(() => {
    if (!search) return campaignRows;
    const q = search.toLowerCase();
    return campaignRows.filter(r =>
      String(r.Campaign || '').toLowerCase().includes(q) ||
      String(r.Account_Name || '').toLowerCase().includes(q) ||
      String(r.Product_Name || '').toLowerCase().includes(q));
  }, [campaignRows, search]);

  const currentRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (appliedStartDate) params.set('startDate', appliedStartDate);
      if (appliedEndDate)   params.set('endDate',   appliedEndDate);
      if (appliedClient   && !appliedClient.startsWith('All'))   params.set('client',   appliedClient);
      if (appliedPlatform && !appliedPlatform.startsWith('All')) params.set('platform', appliedPlatform);
      if (appliedAdGroup  && !appliedAdGroup.startsWith('All'))  params.set('adGroup',  appliedAdGroup);
      if (appliedAccount  && !appliedAccount.startsWith('All'))  params.set('account',  appliedAccount);
      if (appliedProduct  && !appliedProduct.startsWith('All'))  params.set('product',  appliedProduct);
      const res = await fetch(`/api/exportData?${params.toString()}`);
      const data = await res.json();
      const rows: CampaignRow[] = data.rows;
      const header = ['Account ID','Account Name','Product Name','Campaign','Platform','Date','Spend','Clicks','CPC','Impressions','CPM','Conversions','CPA','In-App Actions','Cost/In-App','Installs','CPI','Views','CPV','Ad Group'];
      const csvRows = rows.map(r => [r.Account_ID, r.Account_Name, r.Product_Name, `"${r.Campaign}"`, r.Platform, r.Date, r.Spend, r.Clicks, r.CPC, r.Impressions, r.CPM, r.Conversions, r.Cost_Per_Conversion, r.In_App_actions, r.Cost_Per_In_app_action, r.Installs, r.CPI, r.Views, r.CPV, `"${r.Ad_group_Name}"`]);
      const csv = [header, ...csvRows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'campaign-report.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
    finally { setExporting(false); }
  };

  const activeChartMetrics = kpiMetrics.filter(m => selectedKeys.has(m.key));

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

      {modifyOpen && (
        <ModifyMetricsModal
          selectedMetrics={kpiMetrics}
          onClose={() => setModifyOpen(false)}
          onApply={newMetrics => {
            setKpiMetrics(newMetrics);
            setSelectedKeys(new Set(newMetrics.map(m => m.key)));
          }}
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
          <FilterDropdown label="Account"  value={appliedAccount  || 'All accounts'}  options={['All accounts',  ...allAccounts]}  onChange={v => applyFilters({ account: v })}  />
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
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-200 overflow-x-auto">
              {kpiMetrics.map((metric, i) => (
                <KpiBox
                  key={`kpi-${i}`}
                  metric={metric}
                  value={metricValues[metric.key] || 0}
                  isSelected={selectedKeys.has(metric.key)}
                  onToggle={() => toggleSelected(metric.key)}
                  onMetricChange={m => {
                    const next = [...kpiMetrics]; next[i] = m; setKpiMetrics(next);
                    setSelectedKeys(prev => {
                      const next2 = new Set(prev);
                      if (next2.has(metric.key)) { next2.delete(metric.key); next2.add(m.key); }
                      return next2;
                    });
                  }}
                />
              ))}
              <div className="flex items-center gap-1 px-3 border-l border-slate-200 bg-slate-50/50 flex-shrink-0">
                <button onClick={() => setModifyOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg hover:bg-slate-100 transition text-slate-500 hover:text-slate-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-[10px] font-medium">Metrics</span>
                </button>
                <KpiChartMenu chartData={chartData} activeMetrics={activeChartMetrics} />
              </div>
            </div>
            <DynamicChart chartData={chartData} activeMetrics={activeChartMetrics} />
          </div>

          {exporting && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 font-medium flex items-center gap-2">
              <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
              Preparing export...
            </div>
          )}

          <SmartTable rows={currentRows} page={page} pageSize={pageSize} total={filteredRows.length} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}

// ── getServerSideProps ─────────────────────────────────────────────────────────
export const getServerSideProps = async ({ req, query }: any) => {
  const cookie  = req.headers.cookie || '';
  const match   = cookie.split(';').map((c: string) => c.trim()).find((c: string) => c.startsWith('saas_dashboard_token='));
  const token   = match ? match.split('=')[1] : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return { redirect: { destination: '/', permanent: false } };

  const startDate = (query.startDate as string) || '';
  const endDate   = (query.endDate   as string) || '';
  const platform  = (query.platform  as string) || '';
  const client    = (query.client    as string) || '';
  const adGroup   = (query.adGroup   as string) || '';
  const account   = (query.account   as string) || '';
  const product   = (query.product   as string) || '';

  const conditions: string[] = [];
  if (startDate && endDate) conditions.push(`CONVERT(DATE, [Date]) >= '${startDate}' AND CONVERT(DATE, [Date]) <= '${endDate}'`);
  if (platform)             conditions.push(`[Platform] = '${platform.replace(/'/g, "''")}'`);
  if (client)               conditions.push(`[Account Name] = '${client.replace(/'/g, "''")}'`);
  if (adGroup)              conditions.push(`[Ad_group_Name] = '${adGroup.replace(/'/g, "''")}'`);
  if (account)              conditions.push(`[Account_ID] = '${account.replace(/'/g, "''")}'`);
  if (product)              conditions.push(`[Product Name] = '${product.replace(/'/g, "''")}'`);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [metricsResult, previewRows, chartRows, dc, dp, da, dac, dprod] = await Promise.all([
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
        SELECT TOP 500
          CAST([Account_ID] AS NVARCHAR(50)) AS Account_ID,
          [Account Name]    AS Account_Name,
          [Product Name]    AS Product_Name,
          [Campaign],
          CONVERT(NVARCHAR(10), [Date], 120) AS Date,
          CAST([Spend]                  AS FLOAT)  AS Spend,
          CAST([Clicks]                 AS BIGINT) AS Clicks,
          CAST([CPC]                    AS FLOAT)  AS CPC,
          CAST([Impressions]            AS BIGINT) AS Impressions,
          CAST([CPM]                    AS FLOAT)  AS CPM,
          CAST([Conversions]            AS FLOAT)  AS Conversions,
          CAST([Cost_Per_Conversion]    AS FLOAT)  AS Cost_Per_Conversion,
          CAST([In_App_actions]         AS FLOAT)  AS In_App_actions,
          CAST([Cost_Per_In_app_action] AS FLOAT)  AS Cost_Per_In_app_action,
          CAST([Installs]               AS FLOAT)  AS Installs,
          CAST([CPI]                    AS FLOAT)  AS CPI,
          CAST([Views]                  AS BIGINT) AS Views,
          CAST([CPV]                    AS FLOAT)  AS CPV,
          [Ad_group_Name],
          [Platform]
        FROM [Campaign Data].[dbo].[Jazz_GSM_view]
        ${whereClause} ORDER BY [Date] DESC
      `) as Promise<any[]>,

      prisma.$queryRawUnsafe(`
        SELECT
          CONVERT(NVARCHAR(10), [Date], 120) AS date,
          ISNULL(SUM(CAST([Spend]          AS FLOAT)), 0) AS Spend,
          ISNULL(SUM(CAST([Clicks]         AS BIGINT)), 0) AS Clicks,
          ISNULL(SUM(CAST([Impressions]    AS BIGINT)), 0) AS Impressions,
          ISNULL(SUM(CAST([Conversions]    AS FLOAT)), 0) AS Conversions,
          ISNULL(SUM(CAST([Installs]       AS FLOAT)), 0) AS Installs,
          ISNULL(SUM(CAST([In_App_actions] AS FLOAT)), 0) AS InAppActions,
          ISNULL(SUM(CAST([Views]          AS BIGINT)), 0) AS Views,
          CASE WHEN SUM(CAST([Clicks] AS FLOAT)) > 0
            THEN SUM(CAST([Spend] AS FLOAT)) / SUM(CAST([Clicks] AS FLOAT)) ELSE 0 END AS CPC,
          CASE WHEN SUM(CAST([Impressions] AS FLOAT)) > 0
            THEN (SUM(CAST([Spend] AS FLOAT)) / SUM(CAST([Impressions] AS FLOAT))) * 1000 ELSE 0 END AS CPM,
          CASE WHEN SUM(CAST([Conversions] AS FLOAT)) > 0
            THEN SUM(CAST([Spend] AS FLOAT)) / SUM(CAST([Conversions] AS FLOAT)) ELSE 0 END AS Cost_Per_Conversion
        FROM [Campaign Data].[dbo].[Jazz_GSM_view]
        ${whereClause}
        GROUP BY CONVERT(NVARCHAR(10), [Date], 120)
        ORDER BY date ASC
      `) as Promise<any[]>,

      prisma.$queryRawUnsafe(`SELECT DISTINCT [Account Name]  AS val FROM [Campaign Data].[dbo].[Jazz_GSM_view] WHERE [Account Name]  IS NOT NULL ORDER BY val`) as Promise<any[]>,
      prisma.$queryRawUnsafe(`SELECT DISTINCT [Platform]      AS val FROM [Campaign Data].[dbo].[Jazz_GSM_view] WHERE [Platform]      IS NOT NULL ORDER BY val`) as Promise<any[]>,
      prisma.$queryRawUnsafe(`SELECT DISTINCT [Ad_group_Name] AS val FROM [Campaign Data].[dbo].[Jazz_GSM_view] WHERE [Ad_group_Name] IS NOT NULL ORDER BY val`) as Promise<any[]>,
      prisma.$queryRawUnsafe(`SELECT DISTINCT [Account_ID]    AS val FROM [Campaign Data].[dbo].[Jazz_GSM_view] WHERE [Account_ID]    IS NOT NULL ORDER BY val`) as Promise<any[]>,
      prisma.$queryRawUnsafe(`SELECT DISTINCT [Product Name]  AS val FROM [Campaign Data].[dbo].[Jazz_GSM_view] WHERE [Product Name]  IS NOT NULL ORDER BY val`) as Promise<any[]>,
    ]);

    const m = (metricsResult as any[])[0] ?? {};

    return {
      props: {
        userName: payload.name,
        appliedStartDate: startDate, appliedEndDate: endDate,
        appliedPlatform: platform,  appliedClient: client,
        appliedAdGroup: adGroup,    appliedAccount: account, appliedProduct: product,
        allClients:   (dc    as any[]).map(r => String(r.val || '')).filter(Boolean),
        allPlatforms: (dp    as any[]).map(r => String(r.val || '')).filter(Boolean),
        allAdGroups:  (da    as any[]).map(r => String(r.val || '')).filter(Boolean),
        allAccounts:  (dac   as any[]).map(r => String(r.val || '')).filter(Boolean),
        allProducts:  (dprod as any[]).map(r => String(r.val || '')).filter(Boolean),
        metrics: {
          totalSpend:        Number(m.totalSpend)        || 0,
          totalConversions:  Number(m.totalConversions)  || 0,
          totalClicks:       Number(m.totalClicks)       || 0,
          totalImpressions:  Number(m.totalImpressions)  || 0,
          totalInstalls:     Number(m.totalInstalls)     || 0,
          totalInAppActions: Number(m.totalInAppActions) || 0,
          totalViews:        Number(m.totalViews)        || 0,
        },
        chartData: (chartRows as any[]).map(r => ({
          date:                String(r.date || ''),
          Spend:               Number(r.Spend)               || 0,
          Clicks:              Number(r.Clicks)              || 0,
          Impressions:         Number(r.Impressions)         || 0,
          Conversions:         Number(r.Conversions)         || 0,
          Installs:            Number(r.Installs)            || 0,
          InAppActions:        Number(r.InAppActions)        || 0,
          Views:               Number(r.Views)               || 0,
          CPC:                 Number(r.CPC)                 || 0,
          CPM:                 Number(r.CPM)                 || 0,
          Cost_Per_Conversion: Number(r.Cost_Per_Conversion) || 0,
        })),
        campaignRows: (previewRows as any[]).map(r => ({
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
    console.error('Dashboard error:', error);
    return {
      props: {
        userName: payload.name,
        appliedStartDate: '', appliedEndDate: '', appliedPlatform: '', appliedClient: '',
        appliedAdGroup: '', appliedAccount: '', appliedProduct: '',
        allClients: [], allPlatforms: [], allAdGroups: [], allAccounts: [], allProducts: [],
        metrics: { totalSpend: 0, totalConversions: 0, totalClicks: 0, totalImpressions: 0, totalInstalls: 0, totalInAppActions: 0, totalViews: 0 },
        chartData: [], campaignRows: [],
      },
    };
  }
};