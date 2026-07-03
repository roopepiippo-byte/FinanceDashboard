import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ColumnDef {
  id: string;
  header: ReactNode;
  /** Default width in px (drag to change; double-click handle to reset). */
  width: number;
  min?: number;
  headerClassName?: string;
}

function storageKey(id: string): string {
  return `colw:${id}`;
}

function loadWidths(id: string, cols: ColumnDef[]): number[] {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (raw) {
      const arr: unknown = JSON.parse(raw);
      if (
        Array.isArray(arr) &&
        arr.length === cols.length &&
        arr.every((n) => typeof n === "number" && Number.isFinite(n))
      ) {
        return arr as number[];
      }
    }
  } catch {
    /* corrupted/unavailable storage -> defaults */
  }
  return cols.map((c) => c.width);
}

function saveWidths(id: string, widths: number[]): void {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(widths));
  } catch {
    /* storage unavailable -> widths just don't persist */
  }
}

/**
 * Table with user-resizable columns: drag a header's right edge, double-click
 * it to reset. Widths persist per table id (localStorage). Children = <tbody>.
 */
export function ResizableTable({
  id,
  columns,
  children,
  containerClassName,
  headClassName,
}: {
  id: string;
  columns: ColumnDef[];
  children: ReactNode;
  /** Class for the scroll container (add max-h + overflow-auto as needed). */
  containerClassName?: string;
  /** Class for <thead> (e.g. sticky positioning). */
  headClassName?: string;
}) {
  const [widths, setWidths] = useState(() => loadWidths(id, columns));
  const widthsRef = useRef(widths);
  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);
  const [dragging, setDragging] = useState(false);

  function startDrag(e: React.PointerEvent, i: number) {
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startW = widthsRef.current[i];
    const min = columns[i].min ?? 48;
    const onMove = (ev: PointerEvent) => {
      const w = Math.max(min, Math.round(startW + ev.clientX - startX));
      setWidths((prev) => prev.map((p, j) => (j === i ? w : p)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragging(false);
      saveWidths(id, widthsRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function resetWidth(i: number) {
    setWidths((prev) => {
      const next = prev.map((p, j) => (j === i ? columns[i].width : p));
      saveWidths(id, next);
      return next;
    });
  }

  return (
    <div className={cn("overflow-x-auto", containerClassName)}>
      <table
        className={cn("min-w-full text-sm", dragging && "select-none")}
        style={{ tableLayout: "fixed" }}
      >
        <colgroup>
          {widths.map((w, i) => (
            <col key={columns[i].id} style={{ width: `${w}px` }} />
          ))}
        </colgroup>
        <thead className={headClassName}>
          <tr className="border-b border-border text-left text-muted">
            {columns.map((c, i) => (
              <th
                key={c.id}
                className={cn(
                  "relative px-4 py-3 font-medium",
                  c.headerClassName,
                )}
              >
                <div className="truncate">{c.header}</div>
                <span
                  onPointerDown={(e) => startDrag(e, i)}
                  onDoubleClick={() => resetWidth(i)}
                  title="Vedä: muuta leveyttä · kaksoisklikkaus: palauta"
                  className="absolute -right-1 top-0 z-10 h-full w-2.5 cursor-col-resize touch-none select-none rounded hover:bg-accent/40 active:bg-accent/60"
                />
              </th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}
