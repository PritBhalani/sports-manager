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
    <div className="min-w-0 rounded-xl bg-surface p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] sm:p-5">
      <p className="truncate text-sm font-medium text-muted">{title}</p>
      <p className="mt-1 truncate text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
        {value}
      </p>
      {subStats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-3">
          {subStats.map(({ label, value: subValue }) => (
            <div key={label}>
              <span className="text-xs text-muted">{label}: </span>
              <span className="text-sm font-medium tabular-nums text-foreground-secondary">
                {subValue}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
