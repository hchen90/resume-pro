import Link from "next/link";

import { languageName, type Locale, locales } from "@/lib/i18n";

type LanguageSwitcherProps = {
  currentLocale: Locale;
  hrefForLocale: (locale: Locale) => string;
  label: string;
};

export function LanguageSwitcher({
  currentLocale,
  hrefForLocale,
  label,
}: LanguageSwitcherProps) {
  return (
    <details className="group relative inline-block text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
          Aa
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            {label}
          </span>
          <span className="block truncate font-medium">
            {languageName(currentLocale)}
          </span>
        </span>
        <span className="ml-1 text-xs text-zinc-400 transition group-open:rotate-180">
          v
        </span>
      </summary>

      <div className="absolute right-0 z-20 mt-2 min-w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-xl">
        {locales.map((locale) => (
          <Link
            key={locale}
            href={hrefForLocale(locale)}
            className={`flex items-center justify-between rounded-md px-3 py-2 transition ${
              locale === currentLocale
                ? "bg-blue-50 text-blue-700"
                : "text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <span>{languageName(locale)}</span>
            {locale === currentLocale ? (
              <span className="text-xs opacity-70">current</span>
            ) : null}
          </Link>
        ))}
      </div>
    </details>
  );
}
