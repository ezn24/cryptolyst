import Link from "next/link";
import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4", className)}
      {...props}
    />
  );
}

export function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-400 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--control)] px-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-emerald-300/70 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-white/10 bg-zinc-950/70 px-3 text-sm text-white focus:border-emerald-300/70 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-20 w-full rounded-md border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-300/70 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("grid gap-1.5 text-xs font-medium text-[var(--muted-strong)]", className)} {...props} />;
}

export function Metric({
  label,
  value,
  tone = "neutral",
  detail,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "positive" | "negative" | "neutral";
  detail?: React.ReactNode;
}) {
  return (
    <Panel className="min-w-0">
      <div className="text-xs text-[var(--muted-strong)]">{label}</div>
      <div
        className={cn(
          "mt-2 break-words text-lg font-semibold",
          tone === "positive" && "metric-positive",
          tone === "negative" && "metric-negative",
        )}
      >
        {value}
      </div>
      {detail ? <div className="mt-1 text-xs text-[var(--muted)]">{detail}</div> : null}
    </Panel>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-48 place-items-center rounded-md border border-dashed border-white/15 px-5 text-center">
      <div>
        <h3 className="font-medium text-[var(--foreground)]">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">{description}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

