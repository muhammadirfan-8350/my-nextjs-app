import { ReactNode } from 'react';

type ChartCardProps = {
  title: string;
  children: ReactNode;
  subtitle?: string;
};

export default function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      <div className="min-h-[280px]">{children}</div>
    </section>
  );
}
