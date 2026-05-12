import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { dictionaries, resolveLocale } from "@/lib/i18n";
import { getCurrentVersion, getReleaseNote } from "@/lib/release-notes";
import {
  defaultUiStyle,
  localeCookieName,
  resolveUiStyle,
  settingsQuery,
  uiStyleCookieName,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ReleaseNoteVersionPage({
  params,
  searchParams,
}: {
  params: Promise<{ version: string }>;
  searchParams: Promise<{ lang?: string; ui?: string }>;
}) {
  const [{ version }, { lang, ui }, cookieStore] = await Promise.all([
    params,
    searchParams,
    cookies(),
  ]);
  const locale = resolveLocale(lang ?? cookieStore.get(localeCookieName)?.value);
  const uiStyle = resolveUiStyle(
    ui ?? cookieStore.get(uiStyleCookieName)?.value ?? defaultUiStyle,
  );
  const t = dictionaries[locale];
  const release = getReleaseNote(version);

  if (!release) {
    notFound();
  }

  const query = settingsQuery({ lang: locale, style: uiStyle });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--app-muted)]">
          <Link href={`/?${query}`} className="hover:text-[var(--app-text)]">
            {t.backHome}
          </Link>
          <Link
            href={`/release-notes?${query}`}
            className="hover:text-[var(--app-text)]"
          >
            {t.releaseNotes}
          </Link>
        </div>
        <p className="mt-6 text-sm uppercase tracking-[0.35em] text-[var(--app-accent)]">
          {t.currentVersion}: {getCurrentVersion()}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {release.version}
        </h1>
        <p className="mt-3 text-[var(--app-muted)]">
          {t.releasedOn}: {release.date || "-"}
        </p>
      </header>

      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">{t.commits}</h2>
        {release.commits.length === 0 ? (
          <p className="mt-4 text-[var(--app-muted)]">{t.noReleaseNotes}</p>
        ) : (
          <ol className="mt-5 space-y-4">
            {release.commits.map((commit) => (
              <li
                key={commit.hash}
                className="rounded-lg border border-[var(--app-border)] bg-[var(--app-muted-surface)] p-4"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--app-muted)]">
                  <span className="font-mono text-[var(--app-accent)]">
                    {commit.shortHash}
                  </span>
                  <span>{commit.date}</span>
                </div>
                <p className="mt-2 font-medium text-[var(--app-text)]">
                  {commit.subject}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
