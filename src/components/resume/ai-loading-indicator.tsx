type AiLoadingIndicatorProps = {
  label: string;
};

export function AiLoadingIndicator({ label }: AiLoadingIndicatorProps) {
  return (
    <div
      className="mr-8 flex items-center gap-2 rounded-lg bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-muted)] ring-1 ring-[var(--app-border)]"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--app-accent)] [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--app-accent)] [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--app-accent)]" />
      </span>
      <span>{label}</span>
    </div>
  );
}
