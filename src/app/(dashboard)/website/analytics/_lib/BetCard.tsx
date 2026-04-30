import React from 'react';
import { formatCurrency } from '@/utils/formatCurrency';
import { signedAmountTextClass } from '@/utils/signedAmountTextClass';

export type BetCardProps = {
  title: string;
  date: string;
  user: string;
  betId: string;
  price: string;
  size: number;
  avg: string | number;
  side?: number; // 1 = Back (Blue), 2 = Lay (Pink)
};

export function BetCard({ title, date, user, betId, price, size, avg, side = 1 }: BetCardProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const sizeStr = mounted ? formatCurrency(size) : String(size);

  const isLay = side === 2;
  const bgColor = isLay ? "bg-[#f4c7cc]" : "bg-[#e3f2fd]";
  const headerColor = isLay ? "bg-[#e8b5bc]" : "bg-[#90caf9]";
  const borderColor = isLay ? "border-[#e8b5bc]" : "border-sky-300";
  const textColor = isLay ? "text-[#721c24]" : "text-[#0d47a1]";

  return (
    <div className={`w-full overflow-hidden rounded-md border ${borderColor} ${bgColor} text-[11px] shadow-sm`}>
      <div className={`${headerColor} px-3 py-2 font-bold ${textColor} leading-tight text-xs`}>
        {title}
      </div>
      <div className="p-3 text-black space-y-1.5">
        <div className="flex justify-between items-start gap-3">
          <div className="flex gap-1 min-w-0">
            <span className="font-bold shrink-0">User :</span>
            <span className="truncate font-medium">{user}</span>
          </div>
          <div className="flex gap-1 shrink-0">
            <span className="font-bold">Date :</span>
            <span className="tabular-nums font-medium">{date}</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center gap-3">
           <div className="flex gap-1 min-w-0">
            <span className="font-bold shrink-0">Price :</span>
            <span className="tabular-nums font-medium">{price}</span>
          </div>
          <div className="flex gap-1 min-w-0">
            <span className="font-bold shrink-0">BetId :</span>
            <span className="truncate font-medium">{betId}</span>
          </div>
        </div>

        <div className={`flex justify-between items-center border-t ${isLay ? 'border-rose-200/60' : 'border-sky-200/60'} pt-2 mt-1`}>
          <div className="flex gap-1">
            <span className="font-bold">Size :</span>
            <span className={`tabular-nums font-bold ${signedAmountTextClass(size)}`}>{sizeStr}</span>
          </div>
          <div className="flex gap-1">
            <span className="font-bold">Avg :</span>
            <span className="tabular-nums font-bold">{avg}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
