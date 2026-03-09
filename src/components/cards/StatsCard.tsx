export type SubStat = {
  label: string;
  value: string;
};

type StatsCardProps = {
  title: string;
  value: string;
  subStats?: SubStat[];
};

export default function StatsCard({ title, value, subStats = [] }: StatsCardProps) {
  return (
    <div className="min-w-0 rounded-xl bg-white p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] sm:p-5">
      <p className="truncate text-sm font-medium text-zinc-500">{title}</p>
      <p className="mt-1 truncate text-xl font-semibold tabular-nums text-zinc-900 sm:text-2xl">
        {value}
      </p>
      {subStats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-4 border-t border-zinc-100 pt-3">
          {subStats.map(({ label, value: subValue }) => (
            <div key={label}>
              <span className="text-xs text-zinc-500">{label}: </span>
              <span className="text-sm font-medium tabular-nums text-zinc-700">
                {subValue}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
