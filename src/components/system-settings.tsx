"use client";

import { languageName, type Locale, locales } from "@/lib/i18n";
import {
  localeCookieName,
  type UiStyle,
  uiStyleCookieName,
  uiStyles,
} from "@/lib/settings";

type SystemSettingsProps = {
  currentLocale: Locale;
  currentUiStyle: UiStyle;
  labels: {
    settings: string;
    language: string;
    interfaceStyle: string;
    uiStyles: Record<UiStyle, string>;
  };
};

const cookieMaxAge = 60 * 60 * 24 * 365;

export function SystemSettings({
  currentLocale,
  currentUiStyle,
  labels,
}: SystemSettingsProps) {
  function updateSettings(next: { locale?: Locale; uiStyle?: UiStyle }) {
    const locale = next.locale ?? currentLocale;
    const uiStyle = next.uiStyle ?? currentUiStyle;
    const url = new URL(window.location.href);

    url.searchParams.set("lang", locale);
    url.searchParams.set("ui", uiStyle);
    document.cookie = `${localeCookieName}=${locale}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
    document.cookie = `${uiStyleCookieName}=${uiStyle}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
    document.documentElement.dataset.uiStyle = uiStyle;
    window.location.href = url.toString();
  }

  return (
    <details className="group relative inline-block text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-muted-surface)] [&::-webkit-details-marker]:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--app-accent-soft)] text-[var(--app-accent)] ring-1 ring-[var(--app-accent-border)]">
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="currentColor"
          >
            <path d="M8 1.75a.75.75 0 0 1 .75.75v.51a5.5 5.5 0 0 1 1.35.56l.36-.36a.75.75 0 1 1 1.06 1.06l-.36.36c.25.42.44.88.56 1.35h.51a.75.75 0 0 1 0 1.5h-.51a5.5 5.5 0 0 1-.56 1.35l.36.36a.75.75 0 0 1-1.06 1.06l-.36-.36a5.5 5.5 0 0 1-1.35.56v.51a.75.75 0 0 1-1.5 0v-.51a5.5 5.5 0 0 1-1.35-.56l-.36.36a.75.75 0 0 1-1.06-1.06l.36-.36a5.5 5.5 0 0 1-.56-1.35H3.75a.75.75 0 0 1 0-1.5h.51c.12-.47.31-.93.56-1.35l-.36-.36a.75.75 0 0 1 1.06-1.06l.36.36c.42-.25.88-.44 1.35-.56V2.5A.75.75 0 0 1 8 1.75Zm0 3.5a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z" />
          </svg>
        </span>
        <span className="font-medium">{labels.settings}</span>
        <span className="text-xs text-[var(--app-muted)] transition group-open:rotate-180">
          v
        </span>
      </summary>

      <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-xl">
        <label className="block text-xs font-semibold text-[var(--app-muted)]">
          {labels.language}
          <select
            value={currentLocale}
            onChange={(event) =>
              updateSettings({ locale: event.target.value as Locale })
            }
            className="mt-2 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-3 py-2 text-sm font-medium text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
          >
            {locales.map((locale) => (
              <option key={locale} value={locale}>
                {languageName(locale)}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-xs font-semibold text-[var(--app-muted)]">
          {labels.interfaceStyle}
          <select
            value={currentUiStyle}
            onChange={(event) =>
              updateSettings({ uiStyle: event.target.value as UiStyle })
            }
            className="mt-2 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-3 py-2 text-sm font-medium text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
          >
            {uiStyles.map((style) => (
              <option key={style} value={style}>
                {labels.uiStyles[style]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </details>
  );
}
