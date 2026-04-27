import { MetricDef } from '../pages/dashboard';
import { useRef, useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

type ChartDataPoint = {
  date: string; Spend: number; Clicks: number; Impressions: number; Conversions: number;
  CPC: number; CPM: number; Installs: number; InAppActions: number; Views: number;
  Cost_Per_Conversion: number;
};

function CustomTooltip({ active, payload, label, activeMetrics }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-xl p-3 text-xs min-w-[200px]" style={{ zIndex: 9999 }}>
      <p className="font-bold text-slate-700 mb-2 pb-1 border-b border-slate-100">{label}</p>
      {activeMetrics.map((m: MetricDef) => {
        const p = payload.find((pp: any) => pp.dataKey === m.key);
        return (
          <div key={m.key} className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
              <span className="text-slate-500">{m.label}</span>
            </div>
            <span className="font-bold text-slate-800">{p ? m.format(p.value) : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChartMenu({ onExportCSV, onExportPNG }: {
  onExportCSV: () => void;
  onExportPNG: () => void;
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-300 hover:text-slate-500"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <circle cx="12" cy="5" r="1.5"/>
          <circle cx="12" cy="12" r="1.5"/>
          <circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-slate-100 bg-white shadow-lg overflow-hidden">
            <button
              onClick={() => { onExportCSV(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export data
            </button>
            <div className="border-t border-slate-100" />
            <button
              onClick={() => { onExportPNG(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Export as image
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardChart({
  chartData,
  activeMetrics,
}: {
  chartData: ChartDataPoint[];
  activeMetrics: MetricDef[];
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const exportCSV = () => {
    if (!chartData.length || !activeMetrics.length) return;
    const headers = ['Date', ...activeMetrics.map(m => m.label)];
    const rows = chartData.map(d => [
      d.date,
      ...activeMetrics.map(m => String((d as any)[m.key] || 0)),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `chart-data-${Date.now()}.csv`;
    a.href = url; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPNG = () => {
    try {
      const svgEl = chartRef.current?.querySelector('svg');
      if (!svgEl) return;
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const canvas = document.createElement('canvas');
      const { width, height } = svgEl.getBoundingClientRect();
      canvas.width  = width  * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const img = new Image();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const a = document.createElement('a');
        a.download = `chart-${Date.now()}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      };
      img.src = url;
    } catch (err) {
      console.error('PNG export error:', err);
    }
  };

  if (!chartData.length || !activeMetrics.length) {
    return (
      <div className="flex items-center justify-center h-56 text-slate-300 text-sm">
        No chart data
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="flex justify-end mb-1">
        <ChartMenu onExportCSV={exportCSV} onExportPNG={exportPNG} />
      </div>
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Tooltip
              content={(props: any) => <CustomTooltip {...props} activeMetrics={activeMetrics} />}
              wrapperStyle={{ zIndex: 9999 }}
            />
            {activeMetrics.map(m => (
              <Line
                key={m.key}
                type="monotone"
                dataKey={m.key}
                stroke={m.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: m.color, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}