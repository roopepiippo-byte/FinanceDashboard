import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useStore } from "@/store";
import { Sidebar } from "./Sidebar";
import { DateRangePicker } from "./DateRangePicker";

const PAGE_TITLES: Record<string, string> = {
  "/": "Kojelauta",
  "/transactions": "Tapahtumat",
  "/budget": "Budjetti",
  "/wealth": "Varallisuus",
  "/unmapped": "Luokittele",
  "/import": "Tuo CSV",
  "/settings": "Asetukset",
};

/** Pages whose content is scoped by the global date range. */
const RANGE_SCOPED = new Set(["/", "/transactions"]);

export function Layout() {
  const hydrated = useStore((s) => s.hydrated);
  const init = useStore((s) => s.init);
  const { pathname } = useLocation();

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex min-h-14 items-center justify-between gap-4 border-b border-border bg-bg px-6 py-2.5">
          <h2 className="text-lg font-semibold text-text">
            {PAGE_TITLES[pathname] ?? "Ledger"}
          </h2>
          {RANGE_SCOPED.has(pathname) && <DateRangePicker />}
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {hydrated ? (
            <Outlet />
          ) : (
            <p className="text-sm text-muted">Ladataan…</p>
          )}
        </main>
      </div>
    </div>
  );
}
