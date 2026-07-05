import { useState } from "react";

/**
 * Small "i" icon that toggles an explanatory popover on click. Used beside
 * card titles so a new user can learn what each figure/chart means.
 */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        aria-label="Ohje"
        title="Ohje"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex text-muted/50 transition-colors hover:text-accent"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-5M12 8h.01" />
        </svg>
      </button>
      {open && (
        <>
          <span
            className="fixed inset-0 z-40 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <span className="absolute left-0 top-6 z-50 block w-72 max-w-[80vw] rounded-md border border-border bg-card p-3 text-xs font-normal normal-case leading-relaxed tracking-normal text-text shadow-xl">
            {text}
          </span>
        </>
      )}
    </span>
  );
}
