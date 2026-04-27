'use client';

import { Line, Bar, Pie, ResponsiveContainer, LineChart, BarChart, PieChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import ChartCard from './ChartCard';

type DashboardChartsProps = {
  trendData: Array<{ date: string; spend: number; conversions: number }>;
  productPerformance: Array<{ name: string; spend: number; conversions: number }>;
};

export default function DashboardCharts({ trendData, productPerformance }: DashboardChartsProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <ChartCard title="Daily spend vs conversions" subtitle="Trend over the selected range">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="spend" stroke="#f59e0b" strokeWidth={3} dot={false} name="Spend" />
            <Line type="monotone" dataKey="conversions" stroke="#1d4ed8" strokeWidth={3} dot={false} name="Conversions" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-5">
        <ChartCard title="Platform performance" subtitle="Spend share by channel">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={productPerformance} dataKey="spend" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#f59e0b" label />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Product wise performance" subtitle="Conversions across products">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={productPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="conversions" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
