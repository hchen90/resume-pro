export type PrintBackdropVariant =
  | "elegant-full"
  | "creative-full"
  | "modern-sidebar";

export function getPrintBackdropVariant(
  templateId: string,
): PrintBackdropVariant | null {
  if (templateId === "elegant") {
    return "elegant-full";
  }
  if (templateId === "creative") {
    return "creative-full";
  }
  if (templateId === "modern") {
    return "modern-sidebar";
  }
  return null;
}

const variantClass: Record<PrintBackdropVariant, string> = {
  "elegant-full": "resume-print-backdrop--elegant-full",
  "creative-full": "resume-print-backdrop--creative-full",
  "modern-sidebar": "resume-print-backdrop--modern-sidebar",
};

/** Fixed layer repeated on each printed page (Chrome needs a real element, not ::before). */
export function ResumePrintBackdrop({ variant }: { variant: PrintBackdropVariant }) {
  return (
    <div
      aria-hidden
      className={`resume-print-backdrop ${variantClass[variant]}`}
    />
  );
}
