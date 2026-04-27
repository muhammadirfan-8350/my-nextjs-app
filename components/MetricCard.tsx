import { FC } from "react";

type MetricCardProps = {
  title: string;
  value: number | string;
  trend?: number;
  icon?: React.ReactNode;
};

const formatValue = (value: number | string, title: string): string => {
  if (typeof value === "string") return value;
  const isMonetary = ["Total Spend", "Avg CPA"].includes(title);
  if (value >= 1_000_000_000) return isMonetary ? `PKR ${(value / 1_000_000_000).toFixed(1)}B` : `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000)     return isMonetary ? `PKR ${(value / 1_000_000).toFixed(1)}M`     : `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)         return isMonetary ? `PKR ${(value / 1_000).toFixed(1)}K`         : `${(value / 1_000).toFixed(1)}K`;
  return isMonetary ? `PKR ${value.toLocaleString()}` : value.toLocaleString();
};

const iconMap: Record<string, string> = {
  "Total Spend":  "$",
  "Impressions":  "◎",
  "Clicks":       "↗",
  "Sales":        "🛒",
  "App Installs": "📱",
  "Engagement":   "♡",
  "Conversions":  "⚡",
  "Avg CPA":      "❋",
  "ROAS":         "↗",
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  "Total Spend":  { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-100"   },
  "Impressions":  { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-100"    },
  "Clicks":       { bg: "bg-cyan-50",    text: "text-cyan-600",    border: "border-cyan-100"    },
  "Sales":        { bg: "bg-orange-50",  text: "text-orange-600",  border: "border-orange-100"  },
  "App Installs": { bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-100"  },
  "Engagement":   { bg: "bg-pink-50",    text: "text-pink-600",    border: "border-pink-100"    },
  "Conversions":  { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  "Avg CPA":      { bg: "bg-purple-50",  text: "text-purple-600",  border: "border-purple-100"  },
  "ROAS":         { bg: "bg-teal-50",    text: "text-teal-600",    border: "border-teal-100"    },
};

const upIsGood = new Set(["Total Spend","Impressions","Clicks","Sales","App Installs","Engagement","Conversions","ROAS"]);

const MetricCard: FC<MetricCardProps> = ({ title, value, trend }) => {
  const colors = colorMap[title] || { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
  const emoji = iconMap[title] || "$";
  const isPositive = trend !== undefined && trend >= 0;
  const trendGood = upIsGood.has(title) ? isPositive : !isPositive;

  return (
    <div className={`rounded-2xl border ${colors.border} bg-white p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[100px]`}>
      {/* Top row: icon+title | trend badge */}
      <div className="flex items-start justify-between gap-1 mb-3">
        <div className={`flex items-center gap-1 rounded-full ${colors.bg} px-2 py-0.5 shrink-0`}>
          <span className={`text-xs font-bold ${colors.text}`}>{emoji}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${colors.text} whitespace-nowrap`}>
            {title}
          </span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
            trendGood ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
          }`}>
            <span>{isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <p className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
        {formatValue(value, title)}
      </p>
    </div>
  );
};

export default MetricCard;