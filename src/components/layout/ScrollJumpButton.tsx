"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const TOP_THRESHOLD_PX = 120;

type Props = {
  scrollRef: RefObject<HTMLElement | null>;
};

/**
 * Floating control: light surface by default, dark on hover.
 * Near top of scroll → scroll to bottom; scrolled down → scroll to top.
 */
export function ScrollJumpButton({ scrollRef }: Props) {
  const [atTop, setAtTop] = useState(true);
  const [hasOverflow, setHasOverflow] = useState(false);

  const sync = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAtTop(el.scrollTop < TOP_THRESHOLD_PX);
    setHasOverflow(el.scrollHeight > el.clientHeight + 1);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [scrollRef, sync]);

  const onClick = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (atTop) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!hasOverflow) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={atTop ? "Scroll to bottom" : "Scroll to top"}
      className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface-muted text-foreground-tertiary shadow-sm transition-colors hover:border-secondary hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {atTop ? (
        <ChevronDown className="h-5 w-5" aria-hidden />
      ) : (
        <ChevronUp className="h-5 w-5" aria-hidden />
      )}
    </button>
  );
}
