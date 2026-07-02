import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { useUncategorizedCount } from "@/store/selectors";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Requires imported data to be enabled (FR-030). */
  needsData?: boolean;
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

const NAV: NavItem[] = [
  {
    to: "/",
    label: "Kojelauta",
    needsData: true,
    icon: <Icon d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" />,
  },
  {
    to: "/transactions",
    label: "Tapahtumat",
    needsData: true,
    icon: <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  },
  {
    to: "/budget",
    label: "Budjetti",
    needsData: true,
    icon: <Icon d="M12 2a10 10 0 1 0 10 10h-10z M14 2.5a10 10 0 0 1 7.5 7.5H14z" />,
  },
  {
    to: "/wealth",
    label: "Varallisuus",
    icon: <Icon d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  },
  {
    to: "/unmapped",
    label: "Luokittele",
    needsData: true,
    icon: (
      <Icon d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8z" />
    ),
  },
  {
    to: "/import",
    label: "Tuo CSV",
    icon: <Icon d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  },
  {
    to: "/settings",
    label: "Asetukset",
    icon: (
      <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    ),
  },
];

export function Sidebar() {
  const hasData = useStore((s) => s.rawTransactions.length > 0);
  const uncategorized = useUncategorizedCount();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M4 19V5M4 15l5-4 4 3 7-6" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-semibold leading-tight text-text">
            Ledger
          </h1>
          <p className="text-xs text-muted">Oma talous</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map((item) => {
          const disabled = item.needsData && !hasData;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              aria-disabled={disabled || undefined}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  disabled
                    ? "pointer-events-none text-muted/40"
                    : isActive
                      ? "bg-accent/12 font-medium text-text"
                      : "text-muted hover:bg-bg hover:text-text",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !disabled && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  <span className={isActive && !disabled ? "text-accent" : ""}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.to === "/unmapped" && uncategorized > 0 && (
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-300">
                      {uncategorized}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-3">
        <p className="text-[11px] leading-relaxed text-muted/70">
          Tiedot vain tällä laitteella
        </p>
      </div>
    </aside>
  );
}
