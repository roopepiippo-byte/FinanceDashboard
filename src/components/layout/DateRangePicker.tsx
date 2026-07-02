import { useStore } from "@/store";
import {
  computeRange,
  PRESET_LABELS_FI,
  type RangePreset,
} from "@/lib/dateRange";
import { formatDateFi } from "@/lib/format";

const PRESETS: RangePreset[] = [
  "thisMonth",
  "lastMonth",
  "last3",
  "last6",
  "last12",
  "thisYear",
  "lastYear",
  "custom",
];

export function DateRangePicker() {
  const range = useStore((s) => s.range);
  const setRange = useStore((s) => s.setRange);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Aikaväli"
        value={range.preset}
        onChange={(e) => {
          const preset = e.target.value as RangePreset;
          if (preset === "custom") {
            setRange({ ...range, preset });
          } else {
            setRange(computeRange(preset));
          }
        }}
        className="h-9 rounded-md border border-border bg-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {PRESETS.map((p) => (
          <option key={p} value={p}>
            {PRESET_LABELS_FI[p]}
          </option>
        ))}
      </select>

      {range.preset === "custom" ? (
        <div className="flex items-center gap-1 text-sm">
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            className="h-9 rounded-md border border-border bg-card px-2 text-text"
          />
          <span className="text-muted">–</span>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            className="h-9 rounded-md border border-border bg-card px-2 text-text"
          />
        </div>
      ) : (
        <span className="text-sm text-muted">
          {formatDateFi(range.from)} – {formatDateFi(range.to)}
        </span>
      )}
    </div>
  );
}
