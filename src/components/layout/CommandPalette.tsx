"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog } from "@/components";
import {
  COMMAND_PALETTE_ROUTES,
  filterCommandRoutes,
  type CommandPaletteRoute,
} from "@/config/commandPaletteRoutes";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const filtered = useMemo(() => filterCommandRoutes(query), [query]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const go = useCallback(
    (item: CommandPaletteRoute) => {
      router.push(item.href);
      onClose();
    },
    [router, onClose],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) =>
          Math.min(i + 1, Math.max(0, filtered.length - 1)),
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && filtered[selected]) {
        e.preventDefault();
        go(filtered[selected]);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, filtered, selected, go]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-palette-index="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, selected]);

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title="Search pages"
      maxWidthClassName="max-w-xl"
    >
      <div className="-mx-4 -mt-2 sm:-mx-5 sm:-mt-3">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <Search className="h-5 w-5 shrink-0 text-placeholder" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full border-0 bg-transparent text-[15px] text-foreground placeholder:text-placeholder focus:outline-none focus:ring-0"
          />
        </div>
        <ul
          ref={listRef}
          className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted">
              No matching pages
            </li>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.Icon;
              const active = i === selected;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    data-palette-index={i}
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => go(item)}
                    className={`flex w-full gap-3 px-4 py-3.5 text-left transition-colors ${
                      active ? "bg-surface-2" : "hover:bg-surface-muted"
                    }`}
                  >
                    <Icon
                      className="mt-0.5 h-5 w-5 shrink-0 text-muted"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">
                        {item.description}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </Dialog>
  );
}
