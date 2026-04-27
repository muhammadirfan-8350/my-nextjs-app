type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
};

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
      <h2 className="text-sm font-semibold text-slate-900">Date Range</h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 flex-col gap-2 text-sm text-slate-600">
          Start
          <input
            type="date"
            value={startDate}
            onChange={(event) => onChange({ startDate: event.target.value, endDate })}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          />
        </label>
        <label className="flex flex-1 flex-col gap-2 text-sm text-slate-600">
          End
          <input
            type="date"
            value={endDate}
            onChange={(event) => onChange({ startDate, endDate: event.target.value })}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          />
        </label>
      </div>
    </div>
  );
}
