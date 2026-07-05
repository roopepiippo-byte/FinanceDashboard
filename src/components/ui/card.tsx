import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { InfoTip } from "./InfoTip";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-card p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  info,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & {
  /** Optional help text shown behind an "i" icon after the title. */
  info?: string;
}) {
  return (
    <h3
      className={cn(
        "text-sm font-medium text-muted",
        info && "flex items-center gap-1.5",
        className,
      )}
      {...props}
    >
      {children}
      {info && <InfoTip text={info} />}
    </h3>
  );
}

export function CardValue({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-1 text-2xl font-semibold text-text", className)}
      {...props}
    />
  );
}
