"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        void document.fonts.ready.then(() => window.print());
      }}
      className="rounded-lg bg-[var(--app-primary)] px-5 py-3 font-semibold text-white hover:bg-[var(--app-primary-hover)]"
    >
      {label}
    </button>
  );
}
