import { useRef, useState } from "react";
import { useStore } from "@/store";
import { selectCategories } from "@/store/selectors";
import { useToast } from "@/components/ui/toast";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { cn } from "@/lib/cn";
import type { CategoryClass } from "@/types";

type DangerAction = "transactions" | "map" | "all" | null;

export function Settings() {
  const transactions = useStore((s) => s.rawTransactions);
  const importedFiles = useStore((s) => s.importedFiles);
  const categoryMap = useStore((s) => s.categoryMap);
  // Subscribe so the category list re-renders on visibility/custom changes.
  useStore((s) => s.categorySettings);
  useStore((s) => s.customCategories);
  const importCategoryDb = useStore((s) => s.importCategoryDb);
  const exportCategoryDb = useStore((s) => s.exportCategoryDb);
  const toggleCategoryVisibility = useStore((s) => s.toggleCategoryVisibility);
  const setCategoryColor = useStore((s) => s.setCategoryColor);
  const resetCategoryColors = useStore((s) => s.resetCategoryColors);
  const settings = useStore((s) => s.settings);
  const setQuickSpend = useStore((s) => s.setQuickSpend);
  const setCarChartHidden = useStore((s) => s.setCarChartHidden);
  const addCustomCategory = useStore((s) => s.addCustomCategory);
  const deleteAllTransactions = useStore((s) => s.deleteAllTransactions);
  const clearCategoryMap = useStore((s) => s.clearCategoryMap);
  const resetAll = useStore((s) => s.resetAll);
  const toast = useToast();

  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [busy, setBusy] = useState(false);
  const [danger, setDanger] = useState<DangerAction>(null);
  const [newCat, setNewCat] = useState("");
  const [newClass, setNewClass] = useState<CategoryClass>("expense");
  const [newColor, setNewColor] = useState("#8ab4f8");
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = selectCategories().sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const dateRange = (() => {
    if (transactions.length === 0) return "—";
    const dates = transactions.map((t) => t.date).sort();
    return `${dates[0]} – ${dates[dates.length - 1]}`;
  })();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const summary = await importCategoryDb(await file.text(), mode);
      toast.success(
        `Tuotu ${summary.imported} luokittelusääntöä` +
          (summary.newCustomCategories
            ? `, ${summary.newCustomCategories} uutta luokkaa`
            : "") +
          (summary.skipped ? `, ${summary.skipped} ohitettu` : ""),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tuonti epäonnistui");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleExport() {
    const blob = new Blob([exportCategoryDb()], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kategoriat.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Luokittelutietokanta viety");
  }

  const expenseCategories = categories.filter((c) => c.class === "expense");

  return (
    <div className="max-w-3xl">
      <Card className="mb-4">
        <CardTitle>Tiedot</CardTitle>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
          <Stat label="Tapahtumia" value={String(transactions.length)} />
          <Stat label="Tiedostoja" value={String(importedFiles.length)} />
          <Stat label="Luokittelusääntöjä" value={String(categoryMap.length)} />
          <Stat label="Aikaväli" value={dateRange} />
        </dl>
      </Card>

      <Card className="mb-4">
        <CardTitle>Luokittelutietokanta</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Tuo kauppias→luokka -tietokanta (CSV) tai vie nykyinen takaisin Google
          Sheetsiin. Luokittele-sivulla tehdyt valinnat lisätään tietokantaan
          automaattisesti.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={mode === "merge"}
                onChange={() => setMode("merge")}
              />
              Yhdistä
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
              />
              Korvaa
            </label>
          </div>
          <Button size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Tuodaan…" : "Tuo CSV"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={categoryMap.length === 0}
            onClick={handleExport}
          >
            Vie CSV ({categoryMap.length})
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </div>
      </Card>

      {/* Dashboard preferences */}
      <Card className="mb-4">
        <CardTitle>Kojelauta</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Pikakortit näyttävät neljän valitun luokan kulut aikavälillä.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => (
            <select
              key={i}
              value={settings.quickSpendCategories[i] ?? ""}
              onChange={(e) => {
                const next = [...settings.quickSpendCategories];
                next[i] = e.target.value;
                void setQuickSpend(next.filter(Boolean));
              }}
              className="h-9 rounded-md border border-border bg-bg px-2 text-sm text-text"
            >
              <option value="">—</option>
              {expenseCategories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={!settings.carChartHidden}
            onChange={(e) => void setCarChartHidden(!e.target.checked)}
          />
          Näytä Bensa + Auto -kaavio
        </label>
      </Card>

      {/* Category settings */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Luokat</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await resetCategoryColors();
              toast.success("Oletusvärit palautettu");
            }}
          >
            Palauta oletusvärit
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2 border-b border-border pb-4">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="Uusi luokka"
            className="h-8 rounded-md border border-border bg-bg px-2 text-sm text-text"
          />
          <select
            value={newClass}
            onChange={(e) => setNewClass(e.target.value as CategoryClass)}
            className="h-8 rounded-md border border-border bg-bg px-2 text-sm text-text"
          >
            <option value="expense">Kulut</option>
            <option value="income">Tulot</option>
            <option value="transfer">Siirrot</option>
          </select>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-8 w-10 rounded border border-border bg-bg"
          />
          <Button
            size="sm"
            onClick={async () => {
              await addCustomCategory(newCat, newClass, newColor);
              if (newCat.trim()) toast.success(`Lisätty ${newCat.trim()}`);
              setNewCat("");
            }}
          >
            Lisää
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1"
            >
              <input
                type="color"
                value={c.color}
                onChange={(e) => void setCategoryColor(c.name, e.target.value)}
                title="Vaihda väri"
                className="h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
                style={{ opacity: c.visible ? 1 : 0.3 }}
              />
              <button
                onClick={() => void toggleCategoryVisibility(c.name)}
                className={cn(
                  "min-w-0 flex-1 truncate text-left text-sm",
                  c.visible ? "text-text" : "text-muted/50 line-through",
                )}
                title={c.visible ? "Piilota" : "Näytä"}
              >
                {c.name}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Nimeä klikkaamalla piilotat/näytät luokan; väripallosta vaihdat värin.
        </p>
      </Card>

      {/* Danger zone */}
      <Card className="border-red/30">
        <CardTitle>Tietojen hallinta</CardTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="danger"
            size="sm"
            disabled={transactions.length === 0}
            onClick={() => setDanger("transactions")}
          >
            Poista kaikki tapahtumat
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={categoryMap.length === 0}
            onClick={() => setDanger("map")}
          >
            Tyhjennä luokittelutietokanta
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDanger("all")}>
            Poista kaikki tiedot
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={danger !== null}
        title="Vahvista poisto"
        message={
          danger === "transactions"
            ? "Kaikki tapahtumat ja tuodut tiedostot poistetaan."
            : danger === "map"
              ? "Koko luokittelutietokanta tyhjennetään."
              : "KAIKKI sovelluksen tiedot poistetaan pysyvästi."
        }
        confirmLabel="Poista"
        onCancel={() => setDanger(null)}
        onConfirm={async () => {
          const action = danger;
          setDanger(null);
          if (action === "transactions") await deleteAllTransactions();
          else if (action === "map") await clearCategoryMap();
          else if (action === "all") await resetAll();
          toast.success("Valmis");
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-text">{value}</dd>
    </div>
  );
}
