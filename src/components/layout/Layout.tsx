import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useStore } from "@/store";
import { Sidebar } from "./Sidebar";
import { DateRangePicker } from "./DateRangePicker";
import { Onboarding } from "@/components/Onboarding";

const PAGE_TITLES: Record<string, string> = {
  "/": "Kojelauta",
  "/insights": "Analyysi",
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
  const settings = useStore((s) => s.settings);
  const setOnboardingDone = useStore((s) => s.setOnboardingDone);
  const { pathname } = useLocation();
  const [initError, setInitError] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  const showTour = hydrated && (tourOpen || !settings.onboardingDone);
  const closeTour = () => {
    setTourOpen(false);
    void setOnboardingDone();
  };

  useEffect(() => {
    init().catch((e: unknown) => {
      setInitError(e instanceof Error ? e.message : String(e));
    });
  }, [init]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex min-h-14 items-center justify-between gap-4 border-b border-border bg-bg px-6 py-2.5">
          <h2 className="text-lg font-semibold text-text">
            {PAGE_TITLES[pathname] ?? "Ledger"}
          </h2>
          <div className="flex items-center gap-3">
            {RANGE_SCOPED.has(pathname) && <DateRangePicker />}
            <button
              onClick={() => setTourOpen(true)}
              title="Näytä esittely"
              aria-label="Näytä esittely"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm text-muted transition-colors hover:border-accent hover:text-accent"
            >
              ?
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {initError ? (
            <div className="max-w-lg rounded-[var(--radius-card)] border border-red/40 bg-card p-5 text-sm">
              <p className="font-medium text-red">
                Tietokannan avaaminen epäonnistui
              </p>
              <p className="mt-2 text-muted">
                Selain esti paikallisen tietokannan (IndexedDB). Tarkista,
                ettei käytössä ole yksityinen selaustila, ja lataa sivu
                uudelleen.
              </p>
              <p className="mt-2 text-xs text-muted/60">{initError}</p>
            </div>
          ) : hydrated ? (
            <Outlet />
          ) : (
            <p className="text-sm text-muted">Ladataan…</p>
          )}
        </main>
      </div>

      {showTour && <Onboarding onClose={closeTour} />}
    </div>
  );
}
