"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";

import {
  ResumePrintBackdrop,
  type PrintBackdropVariant,
} from "@/templates/resume/print-backdrop";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Mount print backdrop on `document.body` so Chrome repeats it on every printed page. */
export function PrintBackdropPortal({ variant }: { variant: PrintBackdropVariant }) {
  const isClient = useIsClient();

  if (!isClient) {
    return null;
  }

  return createPortal(<ResumePrintBackdrop variant={variant} />, document.body);
}
