'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie,
} from 'recharts';

type DayData      = { date: string; spend: number; impressions: number; clicks: number; };
type PlatformData = { platform: string; spend: number; impressions: number; clicks: number; conversions: number; };
type ClientData   = { client: string; spend: number; installs: number; };
type MonthData    = {
  month: string; yr: number; mo: number; actualDate: string;
  spend: number; installs: number; conversions: number; cpr: number; platform: string;
};
type Metric   = 'spend' | 'impressions' | 'clicks';
type SortDir  = 'asc' | 'desc';
type SortState = { key: string; dir: SortDir } | null;

type Props = {
  current7D: DayData[]; previous7D: DayData[];
  platformData: PlatformData[]; clientData: ClientData[];
  monthData: MonthData[];
  appliedPlatform?: string; appliedClient?: string;
  appliedSelectedMonth?: string;
  onMonthSelect: (month: string | null) => void;
};

const PLATFORM_COLORS: Record<string, string> = {
  Google: '#F59E0B', Meta: '#3B82F6', TikTok: '#EF4444', Unknown: '#94A3B8', Other: '#8B5CF6',
};
const SPEND_COLOR  = '#94A3B8';
const RESULT_COLOR = '#DC2626';
const CPR_COLOR    = '#F59E0B';

const fv = (v: number, money = false): string => {
  if (money) {
    if (v >= 1e9) return `PKR ${(v/1e9).toFixed(1)}B`;
    if (v >= 1e6) return `PKR ${(v/1e6).toFixed(1)}M`;
    if (v >= 1e3) return `PKR ${(v/1e3).toFixed(1)}K`;
    return `PKR ${v.toFixed(0)}`;
  }
  if (v >= 1e9) return `${(v/1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v/1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v/1e3).toFixed(1)}K`;
  return `${v.toFixed(1)}`;
};

const fvFull = (v: number, money = false): string => {
  if (money) return `PKR ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Bar & Pill Labels ─────────────────────────────────────────────────────────
const CleanBarLabel = ({ x, y, width, value, color }: any) => {
  if (!value || value === 0) return null;
  return (
    <text x={x + width/2} y={y - 5} textAnchor="middle" fill={color} fontSize={9} fontWeight={700}>
      {fv(value)}M
    </text>
  );
};

const PillLabel = ({ x, y, value, color = CPR_COLOR }: any) => {
  if (!value || value === 0) return null;
  const display = value >= 1000 ? fv(value) : Number(value).toFixed(2);
  const w = display.length * 5.5 + 12;
  return (
    <g>
      <rect x={x - w/2} y={y - 18} width={w} height={14} rx={7} fill={color} />
      <text x={x} y={y - 8} fill="white" textAnchor="middle" fontSize={8} fontWeight={700}>{display}</text>
    </g>
  );
};

// ─── Tooltips ──────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-slate-100 shadow-xl p-3 text-xs min-w-[160px]">
      <p className="font-bold text-slate-700 mb-2 pb-1 border-b border-slate-100">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
            <span className="text-slate-500 capitalize">{p.name}</span>
          </div>
          <span className="font-bold text-slate-800">
            {p.name === 'spend' ? fv(p.value, true) :
             p.name?.includes('cost') || p.name?.includes('cpr') ? `PKR ${Number(p.value).toFixed(2)}` :
             fv(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const AreaTooltip = ({ active, payload, label, metric }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-slate-100 shadow-xl p-3 text-xs min-w-[160px]">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-bold text-slate-800">{fv(p.value, metric === 'spend')}</span>
        </div>
      ))}
    </div>
  );
};

const PieTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-xl bg-white border border-slate-100 shadow-xl p-3 text-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.payload.fill }} />
        <span className="font-bold text-slate-800">{d.name}</span>
      </div>
      <p className="text-slate-500">Spend: <span className="font-bold">{fv(d.value, true)}</span></p>
      <p className="text-slate-500">Share: <span className="font-bold">{d.payload.percent}%</span></p>
    </div>
  );
};

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, payload }: any) => {
  const R = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * R);
  const y = cy + r * Math.sin(-midAngle * R);
  const pct = parseFloat(payload.percent);
  if (pct < 5) return null;
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${pct.toFixed(1)}%`}</text>;
};

// ─── Data Table ────────────────────────────────────────────────────────────────
function DataTable({ columns, rows }: {
  columns: { key: string; label: string; isNum?: boolean; isMoney?: boolean }[];
  rows: Record<string, any>[];
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [rows, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {columns.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)}
                className="px-3 py-2.5 text-left font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap">
                <div className="flex items-center gap-1">
                  {col.label}
                  <span className="inline-flex flex-col leading-none ml-1">
                    <span className={`text-[8px] ${sortKey === col.key && sortDir === 'asc' ? 'text-slate-800' : 'text-slate-300'}`}>▲</span>
                    <span className={`text-[8px] ${sortKey === col.key && sortDir === 'desc' ? 'text-slate-800' : 'text-slate-300'}`}>▼</span>
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 transition ${i % 2 !== 0 ? 'bg-slate-50/40' : ''}`}>
              {columns.map(col => (
                <td key={col.key} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                  {col.isMoney ? fvFull(row[col.key], true) :
                   col.isNum   ? fvFull(row[col.key])       :
                   row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Chart Menu with Sort Submenu ──────────────────────────────────────────────
function ChartMenu({ onFullView, onExport, onTable, sortColumns, onSort, currentSort }: {
  onFullView: () => void;
  onExport: () => void;
  onTable: () => void;
  sortColumns: { key: string; label: string }[];
  onSort: (key: string, dir: SortDir) => void;
  currentSort: SortState;
}) {
  const [open, setOpen]         = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const close = () => { setOpen(false); setSortOpen(false); };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(!open); setSortOpen(false); }}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-300 hover:text-slate-500">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-slate-100 bg-white shadow-lg">

            {/* Full View */}
            <button onClick={() => { onFullView(); close(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition rounded-t-xl">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
              Full View
            </button>

            <div className="border-t border-slate-100" />

            {/* Show as table */}
            <button onClick={() => { onTable(); close(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
              </svg>
              Show as a table
            </button>

            <div className="border-t border-slate-100" />

            {/* Export */}
            <button onClick={() => { onExport(); close(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export data
            </button>

            <div className="border-t border-slate-100" />

            {/* Sort by with submenu */}
            <div className="relative">
              <button onClick={() => setSortOpen(!sortOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition rounded-b-xl">
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  Sort by
                </div>
                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {sortOpen && (
                <div className="absolute right-full top-0 mr-1 w-52 rounded-xl border border-slate-100 bg-white shadow-xl z-30 overflow-hidden">
                  {/* Column checkmarks */}
                  {sortColumns.map(col => (
                    <button key={col.key}
                      onClick={() => {
                        const dir = currentSort?.key === col.key && currentSort?.dir === 'asc' ? 'desc' : 'asc';
                        onSort(col.key, dir);
                        close();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition">
                      {currentSort?.key === col.key ? (
                        <svg className="w-3 h-3 text-slate-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : <span className="w-3 flex-shrink-0" />}
                      {col.label}
                    </button>
                  ))}

                  <div className="border-t border-slate-100" />

                  {/* Sort Descending */}
                  <button
                    onClick={() => {
                      const key = currentSort?.key || sortColumns[0]?.key;
                      if (key) { onSort(key, 'desc'); close(); }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition hover:bg-slate-50 ${currentSort?.dir === 'desc' ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
                    {currentSort?.dir === 'desc' ? (
                      <svg className="w-3 h-3 text-slate-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : <span className="w-3 flex-shrink-0" />}
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    Sort descending
                  </button>

                  {/* Sort Ascending */}
                  <button
                    onClick={() => {
                      const key = currentSort?.key || sortColumns[0]?.key;
                      if (key) { onSort(key, 'asc'); close(); }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition hover:bg-slate-50 ${currentSort?.dir === 'asc' ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
                    {currentSort?.dir === 'asc' ? (
                      <svg className="w-3 h-3 text-slate-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : <span className="w-3 flex-shrink-0" />}
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9M3 16h5m4 0l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Sort ascending
                  </button>
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// ─── Full Modal ────────────────────────────────────────────────────────────────
function FullModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode; }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-sm font-bold text-slate-800 italic">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const Leg = ({ color, label, type = 'circle' }: { color: string; label: string; type?: 'circle' | 'line' }) => (
  <div className="flex items-center gap-1 text-[11px] text-slate-500">
    {type === 'circle' && <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />}
    {type === 'line'   && <span className="inline-block w-4 border-t-2" style={{ borderColor: color }} />}
    {label}
  </div>
);

const Card = ({ title, subtitle, menu, children, extra }: {
  title: string; subtitle?: string; menu?: React.ReactNode;
  children: React.ReactNode; extra?: React.ReactNode;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div className="flex items-start justify-between gap-2 px-5 pt-4 pb-1">
      <div className="flex-1 min-w-0">
        <h2 className="text-xs font-bold text-slate-700 italic">{title}</h2>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">{extra}{menu}</div>
    </div>
    <div className="px-5 pb-4">{children}</div>
  </div>
);

const dlCSV = (name: string, headers: string[], rows: any[][]) => {
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name; a.click();
};

// ─── Sort helper ───────────────────────────────────────────────────────────────
const applySort = (data: any[], sort: SortState): any[] => {
  if (!sort) return data;
  return [...data].sort((a, b) => {
    const av = a[sort.key]; const bv = b[sort.key];
    if (typeof av === 'number' && typeof bv === 'number')
      return sort.dir === 'asc' ? av - bv : bv - av;
    return sort.dir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });
};

// ── Sort column definitions per chart ─────────────────────────────────────────
const SORT_COLS = {
  monthwise: [
    { key: 'month', label: 'Month' },
    { key: 'spend', label: 'Spend' },
    { key: 'conversions', label: 'Conversions' },
    { key: 'cpr', label: 'Cost Per Conversion' },
  ],
  platspend: [
    { key: 'month', label: 'Month' },
    { key: 'spend', label: 'Spend' },
  ],
  daywise: [
    { key: 'day', label: 'Day' },
    { key: 'date', label: 'Date' },
    { key: 'spend', label: 'Spend' },
    { key: 'conversions', label: 'Conversions' },
    { key: 'cpr', label: 'Cost Per Conversion' },
  ],
  trend7d: [
    { key: 'date', label: 'Date' },
    { key: 'current', label: 'Current 7D' },
    { key: 'previous', label: 'Previous 7D' },
  ],
  trendvol: [
    { key: 'date', label: 'Date' },
    { key: 'current', label: 'Current 7D Volume' },
    { key: 'previous', label: 'Previous 7D Volume' },
  ],
  trendcpc: [
    { key: 'date', label: 'Date' },
    { key: 'currentCPC', label: 'Current 7D CPC' },
    { key: 'previousCPC', label: 'Previous 7D CPC' },
  ],
  pie: [
    { key: 'name', label: 'Platform' },
    { key: 'value', label: 'Spend' },
    { key: 'percent', label: '% Share' },
  ],
};

// ── Table column definitions ───────────────────────────────────────────────────
const TABLE_COLS = {
  monthwise: [
    { key: 'month', label: 'Month' },
    { key: 'spend', label: 'Spend', isMoney: true },
    { key: 'conversions', label: 'Conversions', isNum: true },
    { key: 'cpr', label: 'Cost Per Conversion', isNum: true },
  ],
  platspend: [
    { key: 'month', label: 'Month' },
    { key: 'spend', label: 'Spend', isMoney: true },
  ],
  daywise: [
    { key: 'day', label: 'Day' },
    { key: 'date', label: 'Date' },
    { key: 'spend', label: 'Spend', isMoney: true },
    { key: 'conversions', label: 'Conversions', isNum: true },
    { key: 'cpr', label: 'Cost Per Conversion', isNum: true },
  ],
  trend7d: [
    { key: 'date', label: 'Date' },
    { key: 'current', label: 'Current 7D', isNum: true },
    { key: 'previous', label: 'Previous 7D', isNum: true },
  ],
  trendvol: [
    { key: 'date', label: 'Date' },
    { key: 'current', label: 'Current 7D Volume', isNum: true },
    { key: 'previous', label: 'Previous 7D Volume', isNum: true },
  ],
  trendcpc: [
    { key: 'date', label: 'Date' },
    { key: 'currentCPC', label: 'Current 7D CPC', isNum: true },
    { key: 'previousCPC', label: 'Previous 7D CPC', isNum: true },
  ],
  pie: [
    { key: 'name', label: 'Platform' },
    { key: 'value', label: 'Spend', isMoney: true },
    { key: 'percent', label: '% Share', isNum: true },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
export default function AnalyticsCharts({
  current7D, previous7D, platformData, clientData, monthData,
  appliedPlatform, appliedClient, appliedSelectedMonth, onMonthSelect,
}: Props) {
  const [metric, setMetric]                     = useState<Metric>('spend');
  const [fullView, setFullView]                 = useState<string | null>(null);
  const [tableView, setTableView]               = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [sorts, setSorts]                       = useState<Record<string, SortState>>({});
  const router = useRouter();

  const selectedMonth = appliedSelectedMonth || null;

  const handleSort = (chartId: string, key: string, dir: SortDir) => {
    setSorts(prev => ({ ...prev, [chartId]: { key, dir } }));
  };

  const getSorted = (data: any[], chartId: string) => applySort(data, sorts[chartId] || null);

  const allPlatforms = useMemo(() =>
    ['All', ...Array.from(new Set(monthData.map(r => r.platform).filter(Boolean)))],
    [monthData]);

  const uniqueMonths = useMemo(() => {
    const seen = new Map<string, { month: string; yr: number; mo: number }>();
    monthData.forEach(r => { if (!seen.has(r.month)) seen.set(r.month, { month: r.month, yr: r.yr, mo: r.mo }); });
    return Array.from(seen.values()).sort((a, b) => a.yr !== b.yr ? a.yr - b.yr : a.mo - b.mo);
  }, [monthData]);

  const monthlyAgg = useMemo(() =>
    uniqueMonths.map(({ month }) => {
      const rows = monthData.filter(r => r.month === month && (selectedPlatform === 'All' || r.platform === selectedPlatform));
      const spend       = rows.reduce((s, r) => s + r.spend, 0);
      const conversions = rows.reduce((s, r) => s + r.conversions, 0);
      const cpr         = conversions > 0 ? spend / conversions : 0;
      return { month, spend, conversions, cpr };
    }), [uniqueMonths, monthData, selectedPlatform]);

  const dayWiseData = useMemo(() => {
    if (!selectedMonth) return [];
    const rows = monthData.filter(r =>
      r.month === selectedMonth && (selectedPlatform === 'All' || r.platform === selectedPlatform));
    const dateMap = new Map<string, { spend: number; conversions: number }>();
    rows.forEach(r => {
      const key = r.actualDate || `${r.yr}-${String(r.mo).padStart(2,'0')}`;
      const ex = dateMap.get(key) || { spend: 0, conversions: 0 };
      dateMap.set(key, { spend: ex.spend + r.spend, conversions: ex.conversions + r.conversions });
    });
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals], i) => ({
        day: i + 1, date,
        spend: vals.spend, conversions: vals.conversions,
        cpr: vals.conversions > 0 ? vals.spend / vals.conversions : 0,
      }));
  }, [selectedMonth, monthData, selectedPlatform]);

  const activeData  = selectedMonth ? dayWiseData : monthlyAgg;
  const totalSpendV = activeData.reduce((s, r) => s + r.spend, 0);
  const totalConvV  = activeData.reduce((s, r) => s + (r as any).conversions, 0);

  const totalPieSpend = platformData.reduce((s, r) => s + r.spend, 0);
  const pieData = platformData.map(r => ({
    name: r.platform, value: r.spend,
    percent: totalPieSpend > 0 ? parseFloat(((r.spend / totalPieSpend) * 100).toFixed(1)) : 0,
    fill: PLATFORM_COLORS[r.platform] || '#8B5CF6',
  }));

  const lineData = useMemo(() =>
    Array.from({ length: Math.max(current7D.length, previous7D.length) }, (_, i) => {
      const curr = current7D[i]; const prev = previous7D[i];
      const label = curr?.date
        ? new Date(curr.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
        : prev?.date ? new Date(prev.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
        : `Day ${i+1}`;
      return { date: label, current: curr?.[metric] ?? 0, previous: prev?.[metric] ?? 0 };
    }), [current7D, previous7D, metric]);

  const cpcLineData = useMemo(() =>
    Array.from({ length: Math.max(current7D.length, previous7D.length) }, (_, i) => {
      const curr = current7D[i]; const prev = previous7D[i];
      const label = curr?.date
        ? new Date(curr.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
        : prev?.date ? new Date(prev.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
        : `Day ${i+1}`;
      return {
        date: label,
        currentCPC:  curr && curr.clicks > 0 ? curr.spend / curr.clicks : 0,
        previousCPC: prev && prev.clicks > 0 ? prev.spend / prev.clicks : 0,
      };
    }), [current7D, previous7D]);

  const handlePieClick = (data: any) => {
    const name = data?.name; if (!name) return;
    const params = new URLSearchParams(window.location.search);
    appliedPlatform === name ? params.delete('platform') : params.set('platform', name);
    router.push(params.toString() ? `/analytics?${params.toString()}` : '/analytics');
  };

  const handleMonthClick = (data: any) => {
    const month = data?.activeLabel || data?.activePayload?.[0]?.payload?.month;
    if (!month) return;
    onMonthSelect(selectedMonth === month ? null : month);
  };

  const metricBtns: { key: Metric; label: string }[] = [
    { key: 'spend', label: 'Spends' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'clicks', label: 'Clicks' },
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // CHARTS
  // ════════════════════════════════════════════════════════════════════════════
  const ComboChart = ({ h = 320, data, xKey = 'month' }: { h?: number; data: any[]; xKey?: string }) => {
    const maxCpr = Math.max(...data.map(d => d.cpr || 0), 1);
    return (
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={data} margin={{ top: 35, right: 20, left: 0, bottom: 0 }}
          onClick={xKey === 'month' ? handleMonthClick : undefined}
          style={{ cursor: xKey === 'month' ? 'pointer' : 'default' }}
          barCategoryGap="20%" barGap={1}>
          <defs>
            <linearGradient id="cSpend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SPEND_COLOR} stopOpacity={0.5} />
              <stop offset="100%" stopColor={SPEND_COLOR} stopOpacity={0.15} />
            </linearGradient>
            <linearGradient id="cConv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={RESULT_COLOR} stopOpacity={1} />
              <stop offset="100%" stopColor={RESULT_COLOR} stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="l" hide />
          <YAxis yAxisId="r" hide domain={[0, maxCpr * 3.5]} />
          <Tooltip content={<ChartTooltip />} />
          <Bar yAxisId="l" dataKey="spend" name="spend" maxBarSize={22} radius={[2,2,0,0]}
            label={{ content: (p: any) => <CleanBarLabel {...p} color={SPEND_COLOR} /> }}>
            {data.map((e, i) => (
              <Cell key={i} fill="url(#cSpend)"
                opacity={xKey === 'month' && selectedMonth && selectedMonth !== e.month ? 0.2 : 0.6} />
            ))}
          </Bar>
          <Bar yAxisId="l" dataKey="conversions" name="conversions" maxBarSize={22} radius={[2,2,0,0]}
            label={{ content: (p: any) => <CleanBarLabel {...p} color={RESULT_COLOR} /> }}>
            {data.map((e, i) => (
              <Cell key={i}
                fill={xKey === 'month' && selectedMonth === e.month ? '#7F1D1D' : 'url(#cConv)'}
                opacity={xKey === 'month' && selectedMonth && selectedMonth !== e.month ? 0.2 : 1} />
            ))}
          </Bar>
          <Line yAxisId="r" type="monotone" dataKey="cpr" name="cost per conversion"
            stroke={CPR_COLOR} strokeWidth={2}
            dot={{ fill: CPR_COLOR, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: CPR_COLOR }}
            label={(props: any) => <PillLabel key={props.index} x={props.x} y={props.y} value={props.value} color={CPR_COLOR} />}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  const PlatformSpendChart = ({ h = 280, data }: { h?: number; data: typeof monthlyAgg }) => {
    const barColor = selectedPlatform !== 'All' ? (PLATFORM_COLORS[selectedPlatform] || RESULT_COLOR) : RESULT_COLOR;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={data} margin={{ top: 28, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cPlat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={barColor} stopOpacity={1} />
              <stop offset="100%" stopColor={barColor} stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="spend" name="spend" fill="url(#cPlat)" radius={[3,3,0,0]} maxBarSize={36}
            label={{ content: (p: any) => <CleanBarLabel {...p} color={barColor} /> }} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  const AreaTrendChart = ({ h = 240 }: { h?: number }) => (
    <ResponsiveContainer width="100%" height={h}>
      <AreaChart data={getSorted(lineData, 'trend7d')} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="aCurr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="aPrev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#94A3B8" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#CBD5E1' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => fv(v, metric === 'spend')} width={65} />
        <Tooltip content={<AreaTooltip metric={metric} />} />
        <Area type="monotone" dataKey="previous" name="Previous 7D"
          stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="4 3"
          fill="url(#aPrev)" dot={false} activeDot={{ r: 3 }} />
        <Area type="monotone" dataKey="current" name="Current 7D"
          stroke="#F59E0B" strokeWidth={2}
          fill="url(#aCurr)" dot={false} activeDot={{ r: 4, fill: '#F59E0B' }} />
      </AreaChart>
    </ResponsiveContainer>
  );

  const TrendLineChart = ({ h = 220, data, keys }: {
    h?: number; data: any[];
    keys: { key: string; color: string; label: string }[];
  }) => (
    <ResponsiveContainer width="100%" height={h}>
      <ComposedChart data={data} margin={{ top: 30, right: 15, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip content={<ChartTooltip />} />
        {keys.map(({ key, color, label }) => (
          <Line key={key} type="monotone" dataKey={key} name={label}
            stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }}
            label={(props: any) => {
              const { x, y, value } = props;
              if (!value) return null;
              const display = value >= 1000 ? fv(value) : Number(value).toFixed(2);
              const w = display.length * 5 + 10;
              return (
                <g key={`lbl-${key}-${props.index}`}>
                  <rect x={x - w/2} y={y - 17} width={w} height={13} rx={6} fill={color} />
                  <text x={x} y={y - 8} fill="white" textAnchor="middle" fontSize={8} fontWeight={700}>{display}</text>
                </g>
              );
            }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );

  const PieChartContent = ({ h = 190 }: { h?: number }) => (
    <>
      <ResponsiveContainer width="100%" height={h}>
        <PieChart>
          <Pie data={getSorted(pieData, 'pie')} cx="50%" cy="50%" innerRadius={52} outerRadius={82}
            paddingAngle={2} dataKey="value" labelLine={false} label={renderPieLabel}
            onClick={handlePieClick} style={{ cursor: 'pointer' }}>
            {getSorted(pieData, 'pie').map((e: any, i: number) => (
              <Cell key={i} fill={e.fill} stroke="none"
                opacity={appliedPlatform && appliedPlatform !== e.name ? 0.35 : 1} />
            ))}
          </Pie>
          <Tooltip content={<PieTip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 space-y-1">
        {getSorted(pieData, 'pie').map((p: any) => (
          <button key={p.name} onClick={() => handlePieClick({ name: p.name })}
            className={`w-full flex items-center justify-between text-[11px] rounded-lg px-2 py-1 transition hover:bg-slate-50 ${appliedPlatform === p.name ? 'bg-orange-50 ring-1 ring-orange-200' : ''}`}>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
              <span className="text-slate-600 font-medium">{p.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{fv(p.value, true)}</span>
              <span className="font-bold text-slate-700 w-10 text-right">{p.percent}%</span>
            </div>
          </button>
        ))}
        <div className="flex items-center justify-between text-[11px] border-t border-slate-100 pt-1.5 px-2">
          <span className="font-bold text-slate-600">Total</span>
          <span className="font-bold text-slate-800">{fv(totalPieSpend, true)}</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Full Modals */}
      {fullView === 'trend7d' && (
        <FullModal title="Current 7D vs Previous 7D" onClose={() => setFullView(null)}>
          <div className="flex justify-end mb-3">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {metricBtns.map(b => (
                <button key={b.key} onClick={() => setMetric(b.key)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${metric === b.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <AreaTrendChart h={420} />
        </FullModal>
      )}
      {fullView === 'pie'       && <FullModal title="Spends By Platform" onClose={() => setFullView(null)}><PieChartContent h={320} /></FullModal>}
      {fullView === 'monthwise' && <FullModal title="Month Wise Spend | Objective | Cost Per Conversion" onClose={() => setFullView(null)}><div className="flex gap-3 mb-3"><Leg color={SPEND_COLOR} label="Spend" /><Leg color={RESULT_COLOR} label="Conversions" /><Leg color={CPR_COLOR} label="Cost Per Conversion" type="line" /></div><ComboChart h={480} data={getSorted(monthlyAgg, 'monthwise')} xKey="month" /></FullModal>}
      {fullView === 'platspend' && <FullModal title="Monthly & Platform-wise Spend Overview" onClose={() => setFullView(null)}><PlatformSpendChart h={420} data={getSorted(monthlyAgg, 'platspend')} /></FullModal>}
      {fullView === 'daywise'   && <FullModal title={`Day Wise — ${selectedMonth}`} onClose={() => setFullView(null)}><div className="flex gap-3 mb-3"><Leg color={SPEND_COLOR} label="Spend" /><Leg color={RESULT_COLOR} label="Conversions" /><Leg color={CPR_COLOR} label="Cost Per Conversion" type="line" /></div><ComboChart h={480} data={getSorted(dayWiseData, 'daywise')} xKey="day" /></FullModal>}
      {fullView === 'trendvol'  && <FullModal title="Current 7D and Previous 7D Cost Trend" onClose={() => setFullView(null)}><TrendLineChart h={420} data={getSorted(lineData, 'trendvol')} keys={[{ key: 'current', color: RESULT_COLOR, label: 'Current 7D Volume' }, { key: 'previous', color: CPR_COLOR, label: 'Previous 7D Volume' }]} /></FullModal>}
      {fullView === 'trendcpc'  && <FullModal title="Current 7D and Previous 7D Cost Per Conversion Trend" onClose={() => setFullView(null)}><TrendLineChart h={420} data={getSorted(cpcLineData, 'trendcpc')} keys={[{ key: 'currentCPC', color: RESULT_COLOR, label: 'Current 7D CPC' }, { key: 'previousCPC', color: CPR_COLOR, label: 'Previous 7D CPC' }]} /></FullModal>}

      {/* Table Modals */}
      {tableView === 'trend7d'   && <FullModal title="Current 7D vs Previous 7D — Table" onClose={() => setTableView(null)}><DataTable columns={TABLE_COLS.trend7d} rows={lineData} /></FullModal>}
      {tableView === 'pie'       && <FullModal title="Spends By Platform — Table" onClose={() => setTableView(null)}><DataTable columns={TABLE_COLS.pie} rows={pieData} /></FullModal>}
      {tableView === 'monthwise' && <FullModal title="Month Wise — Table" onClose={() => setTableView(null)}><DataTable columns={TABLE_COLS.monthwise} rows={monthlyAgg} /></FullModal>}
      {tableView === 'platspend' && <FullModal title="Platform Spend — Table" onClose={() => setTableView(null)}><DataTable columns={TABLE_COLS.platspend} rows={monthlyAgg} /></FullModal>}
      {tableView === 'daywise'   && <FullModal title={`Day Wise — ${selectedMonth} — Table`} onClose={() => setTableView(null)}><DataTable columns={TABLE_COLS.daywise} rows={dayWiseData} /></FullModal>}
      {tableView === 'trendvol'  && <FullModal title="7D Volume Trend — Table" onClose={() => setTableView(null)}><DataTable columns={TABLE_COLS.trendvol} rows={lineData} /></FullModal>}
      {tableView === 'trendcpc'  && <FullModal title="7D Cost Per Conversion — Table" onClose={() => setTableView(null)}><DataTable columns={TABLE_COLS.trendcpc} rows={cpcLineData} /></FullModal>}

      <div className="space-y-4">

        {/* Row 1: 7D + Pie */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
          <Card title="Current 7D vs Previous 7D" subtitle="Side-by-side period comparison"
            extra={
              <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
                {metricBtns.map(b => (
                  <button key={b.key} onClick={() => setMetric(b.key)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${metric === b.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    {b.label}
                  </button>
                ))}
              </div>
            }
            menu={<ChartMenu
              onFullView={() => setFullView('trend7d')}
              onTable={() => setTableView('trend7d')}
              onExport={() => dlCSV('trend7d.csv', ['Date','Current','Previous'], lineData.map(r => [r.date, r.current, r.previous]))}
              sortColumns={SORT_COLS.trend7d}
              currentSort={sorts['trend7d'] || null}
              onSort={(k, d) => handleSort('trend7d', k, d)}
            />}
          >
            <AreaTrendChart />
            <div className="flex items-center justify-center gap-5 mt-2">
              <Leg color="#CBD5E1" label="Previous 7D" type="line" />
              <Leg color="#F59E0B" label="Current 7D"  type="line" />
            </div>
          </Card>

          <Card title="Spends By Platform" subtitle="Click a slice to filter"
            menu={<ChartMenu
              onFullView={() => setFullView('pie')}
              onTable={() => setTableView('pie')}
              onExport={() => dlCSV('platform_spend.csv', ['Platform','Spend','%'], pieData.map(r => [r.name, r.value, r.percent]))}
              sortColumns={SORT_COLS.pie}
              currentSort={sorts['pie'] || null}
              onSort={(k, d) => handleSort('pie', k, d)}
            />}
          >
            {appliedPlatform && (
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 text-orange-600 px-2 py-0.5 text-[11px] font-medium">
                {appliedPlatform}
                <button onClick={() => { const p = new URLSearchParams(window.location.search); p.delete('platform'); router.push(p.toString() ? `/analytics?${p.toString()}` : '/analytics'); }} className="ml-1 hover:text-red-500">✕</button>
              </div>
            )}
            {pieData.length === 0 ? <div className="flex items-center justify-center h-44 text-slate-300 text-sm">No data</div> : <PieChartContent />}
          </Card>
        </div>

        {/* Row 2: Month Wise + Platform */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Month Wise Spend | Objective | Cost Per Conversion"
            extra={<div className="flex gap-2"><Leg color={SPEND_COLOR} label="Spend" /><Leg color={RESULT_COLOR} label="Result" /><Leg color={CPR_COLOR} label="Cost/Result" type="line" /></div>}
            menu={<ChartMenu
              onFullView={() => setFullView('monthwise')}
              onTable={() => setTableView('monthwise')}
              onExport={() => dlCSV('monthwise.csv', ['Month','Spend','Conversions','CPC'], monthlyAgg.map(r => [r.month, r.spend.toFixed(0), r.conversions.toFixed(0), r.cpr.toFixed(2)]))}
              sortColumns={SORT_COLS.monthwise}
              currentSort={sorts['monthwise'] || null}
              onSort={(k, d) => handleSort('monthwise', k, d)}
            />}
          >
            {monthlyAgg.length === 0
              ? <div className="flex items-center justify-center h-56 text-slate-300 text-sm">No data</div>
              : <ComboChart data={getSorted(monthlyAgg, 'monthwise')} xKey="month" />}
          </Card>

          <Card title="Monthly & Platform - wise Spend Overview"
            extra={
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Platform</span>
                <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300 min-w-[80px]">
                  {allPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            }
            menu={<ChartMenu
              onFullView={() => setFullView('platspend')}
              onTable={() => setTableView('platspend')}
              onExport={() => dlCSV('platform_monthly.csv', ['Month','Spend'], monthlyAgg.map(r => [r.month, r.spend.toFixed(0)]))}
              sortColumns={SORT_COLS.platspend}
              currentSort={sorts['platspend'] || null}
              onSort={(k, d) => handleSort('platspend', k, d)}
            />}
          >
            {monthlyAgg.length === 0
              ? <div className="flex items-center justify-center h-56 text-slate-300 text-sm">No data</div>
              : <PlatformSpendChart data={getSorted(monthlyAgg, 'platspend')} />}
          </Card>
        </div>

        {/* Row 3: Day Wise */}
        <Card
          title={selectedMonth ? `Day Wise Spend | Objective | Cost Per Conversion — ${selectedMonth}` : 'Day Wise Spend | Objective | Cost Per Conversion'}
          subtitle={selectedMonth ? 'Day-by-day breakdown' : 'Click a month bar above to see day-wise data'}
          extra={
            <div className="flex items-center gap-2 flex-wrap">
              {selectedMonth ? (
                <>
                  <span className="rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    Spend: <span className="font-bold text-slate-800">{fv(totalSpendV, true)}</span>
                  </span>
                  <span className="rounded-full bg-red-50 border border-red-100 px-2.5 py-0.5 text-[11px] font-medium text-red-600">
                    Conv: <span className="font-bold">{fv(totalConvV)}</span>
                  </span>
                  <button onClick={() => onMonthSelect(null)}
                    className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-50 transition">
                    ← Back
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Leg color={SPEND_COLOR}  label="Spend"       />
                  <Leg color={RESULT_COLOR} label="Result"      />
                  <Leg color={CPR_COLOR}    label="Cost/Result" type="line" />
                </div>
              )}
            </div>
          }
          menu={selectedMonth ? <ChartMenu
            onFullView={() => setFullView('daywise')}
            onTable={() => setTableView('daywise')}
            onExport={() => dlCSV(`daywise_${selectedMonth}.csv`, ['Day','Date','Spend','Conv','CPC'], dayWiseData.map(r => [r.day, r.date, r.spend.toFixed(0), r.conversions.toFixed(0), r.cpr.toFixed(2)]))}
            sortColumns={SORT_COLS.daywise}
            currentSort={sorts['daywise'] || null}
            onSort={(k, d) => handleSort('daywise', k, d)}
          /> : undefined}
        >
          {selectedMonth ? (
            dayWiseData.length === 0
              ? <div className="flex items-center justify-center h-40 text-slate-300 text-sm">No data for {selectedMonth}</div>
              : <ComboChart data={getSorted(dayWiseData, 'daywise')} xKey="day" h={300} />
          ) : (
            <div className="flex items-center justify-center h-16 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-slate-300 text-xs mt-1">
              Click a month bar above to see day-wise breakdown
            </div>
          )}
        </Card>

        {/* Row 4: 7D Trends */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Current 7D and Previous 7D Cost Trend"
            extra={
              <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
                {metricBtns.map(b => (
                  <button key={b.key} onClick={() => setMetric(b.key)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${metric === b.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    {b.label}
                  </button>
                ))}
              </div>
            }
            menu={<ChartMenu
              onFullView={() => setFullView('trendvol')}
              onTable={() => setTableView('trendvol')}
              onExport={() => dlCSV('trend_vol.csv', ['Date','Current','Previous'], lineData.map(r => [r.date, r.current, r.previous]))}
              sortColumns={SORT_COLS.trendvol}
              currentSort={sorts['trendvol'] || null}
              onSort={(k, d) => handleSort('trendvol', k, d)}
            />}
          >
            <div className="flex gap-3 mb-2">
              <Leg color={RESULT_COLOR} label="Current 7D Volume"  />
              <Leg color={CPR_COLOR}    label="Previous 7D Volume" />
            </div>
            {lineData.length === 0
              ? <div className="flex items-center justify-center h-44 text-slate-300 text-sm">No data</div>
              : <TrendLineChart data={getSorted(lineData, 'trendvol')} keys={[{ key: 'current', color: RESULT_COLOR, label: 'Current 7D Volume' }, { key: 'previous', color: CPR_COLOR, label: 'Previous 7D Volume' }]} />}
          </Card>

          <Card title="Current 7D and Previous 7D Cost Per Conversion Trend"
            menu={<ChartMenu
              onFullView={() => setFullView('trendcpc')}
              onTable={() => setTableView('trendcpc')}
              onExport={() => dlCSV('trend_cpc.csv', ['Date','Current CPC','Previous CPC'], cpcLineData.map(r => [r.date, r.currentCPC.toFixed(2), r.previousCPC.toFixed(2)]))}
              sortColumns={SORT_COLS.trendcpc}
              currentSort={sorts['trendcpc'] || null}
              onSort={(k, d) => handleSort('trendcpc', k, d)}
            />}
          >
            <div className="flex gap-3 mb-2">
              <Leg color={RESULT_COLOR} label="Current 7D Cost Per Conversion"  />
              <Leg color={CPR_COLOR}    label="Previous 7D Cost Per Conversion" />
            </div>
            {cpcLineData.length === 0
              ? <div className="flex items-center justify-center h-44 text-slate-300 text-sm">No data</div>
              : <TrendLineChart data={getSorted(cpcLineData, 'trendcpc')} keys={[{ key: 'currentCPC', color: RESULT_COLOR, label: 'Current 7D CPC' }, { key: 'previousCPC', color: CPR_COLOR, label: 'Previous 7D CPC' }]} />}
          </Card>
        </div>

      </div>
    </>
  );
}