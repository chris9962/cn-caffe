"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type Tab = { id: string; label: string; content: ReactNode };

type TabsProps = {
  label: string;
  tabs: Tab[];
};

const NAV_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

export function Tabs({ label, tabs }: TabsProps) {
  const baseId = useId();
  const [selectedId, setSelectedId] = useState(tabs[0]?.id);
  const tabRefs = useRef(new Map<string, HTMLButtonElement | null>());
  // A tab can disappear, e.g. "Phân quyền" after a role change, so the first tab takes over.
  const activeId = tabs.some((tab) => tab.id === selectedId) ? selectedId : tabs[0]?.id;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!NAV_KEYS.has(event.key)) return;
    event.preventDefault();
    const last = tabs.length - 1;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : event.key === "ArrowRight"
            ? (index + 1) % tabs.length
            : (index - 1 + tabs.length) % tabs.length;
    setSelectedId(tabs[next].id);
    tabRefs.current.get(tabs[next].id)?.focus();
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label={label}
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-[var(--surface-strong)] p-1"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current.set(tab.id, element);
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setSelectedId(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                isActive
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[0_1px_3px_rgba(44,58,49,0.18)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {/* Hidden panels stay mounted, so switching tabs keeps unsaved edits. */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== activeId}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
