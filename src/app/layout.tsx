import type { Metadata } from "next";
import { cookies } from "next/headers";

import { defaultLocale, resolveLocale } from "@/lib/i18n";
import {
  defaultUiStyle,
  localeCookieName,
  resolveUiStyle,
  uiStyleCookieName,
} from "@/lib/settings";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Pro",
  description: "Local resume editor with AI assistance.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = resolveLocale(
    cookieStore.get(localeCookieName)?.value ?? defaultLocale,
  );
  const uiStyle = resolveUiStyle(
    cookieStore.get(uiStyleCookieName)?.value ?? defaultUiStyle,
  );

  return (
    <html lang={locale} data-ui-style={uiStyle} className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
