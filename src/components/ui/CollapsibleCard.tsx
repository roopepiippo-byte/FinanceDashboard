import { useState, type ReactNode } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

function load(id: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(`collapse:${id}`);
    return v !== null ? v === "1" : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Expander card: header always visible with a chevron and an optional
 * right-aligned badge (headline figure), content revealed on click.
 * Open/closed state persists per id.
 */
export function CollapsibleCard({
  id,
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(() => load(id, defaultOpen));

  function toggle() {
    setOpen((o) => {
      const next = !o;
      try {
        localStorage.setItem(`collapse:${id}`, next ? "1" : "0");
      } catch {
        /* not persisted */
      }
      return next;
    });
  }

  return (
    <Card className="mt-4 p-0">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] px-5 py-4 text-left transition-colors hover:bg-card-2"
      >
        <span className="flex min-w-0 items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={cn(
              "shrink-0 text-muted transition-transform",
              open && "rotate-90",
            )}
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
          <CardTitle className="truncate">{title}</CardTitle>
        </span>
        {badge && (
          <span className="shrink-0 text-xs tabular-nums text-muted">
            {badge}
          </span>
        )}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </Card>
  );
}
