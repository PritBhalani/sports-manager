"use client";

import { type ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
};

export type TabsProps = {
  tabs: TabItem[];
  activeId: string;
  onTabChange: (id: string) => void;
  className?: string;
};

export default function Tabs({
  tabs,
  activeId,
  onTabChange,
  className = "",
}: TabsProps) {
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className={className}>
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:border-border-strong hover:text-foreground-secondary"
                }`}
                aria-selected={isActive}
                role="tab"
              >
                {tab.icon && (
                  <span className="flex shrink-0" aria-hidden>
                    {tab.icon}
                  </span>
                )}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="pt-4" role="tabpanel">
        {activeTab?.content}
      </div>
    </div>
  );
}
