import { useRef, useState } from "react";
import { useStore } from "@/store";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { cn } from "@/lib/cn";
import { formatDateFi } from "@/lib/format";

export function Import() {
  const importedFiles = useStore((s) => s.importedFiles);
  const importCsv = useStore((s) => s.importCsv);
  const deleteImportedFile = useStore((s) => s.deleteImportedFile);
  const toast = useToast();

  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      try {
        const summary = await importCsv(file);
        toast.success(
          `${summary.filename}: ${summary.added} uutta, ` +
            `${summary.duplicates} kaksoiskappaletta` +
            (summary.errors.length
              ? `, ${summary.errors.length} virhettä`
              : ""),
        );
      } catch (e) {
        toast.error(
          `${file.name}: ${e instanceof Error ? e.message : "Tuonti epäonnistui"}`,
        );
      }
    }
    setBusy(false);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed p-12 text-center transition-colors",
          dragOver
            ? "border-accent bg-accent/10"
            : "border-border bg-card hover:border-accent/60",
        )}
      >
        <p className="text-lg font-medium text-text">
          Vedä Nordea-CSV tähän tai valitse tiedosto
        </p>
        <p className="mt-1 text-sm text-muted">
          Tuki suomalaiselle numeromuodolle. Sama tiedosto voidaan tuoda
          uudelleen turvallisesti.
        </p>
        {busy && <p className="mt-3 text-sm text-accent">Tuodaan…</p>}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      <h3 className="mb-3 mt-8 text-lg font-medium text-text">
        Tuodut tiedostot
      </h3>
      {importedFiles.length === 0 ? (
        <Card className="text-sm text-muted">Ei tuotuja tiedostoja vielä.</Card>
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3 font-medium">Tiedosto</th>
                <th className="px-4 py-3 font-medium">Tuotu</th>
                <th className="px-4 py-3 font-medium">Tapahtumia</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {importedFiles.map((f) => (
                <tr key={f.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text">{f.filename}</td>
                  <td className="px-4 py-3 text-muted">
                    {formatDateFi(f.importedAt.slice(0, 10))}
                  </td>
                  <td className="px-4 py-3 text-muted">{f.transactionCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(f.id)}
                    >
                      Poista
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Poista tiedosto"
        message="Tiedosto ja siitä tuodut tapahtumat poistetaan pysyvästi."
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const id = pendingDelete!;
          setPendingDelete(null);
          await deleteImportedFile(id);
          toast.success("Tiedosto poistettu");
        }}
      />
    </div>
  );
}
