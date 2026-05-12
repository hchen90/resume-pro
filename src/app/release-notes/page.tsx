import Link from "next/link";
import { cookies } from "next/headers";

import { dictionaries, resolveLocale } from "@/lib/i18n";
import {
  defaultUiStyle,
  localeCookieName,
  resolveUiStyle,
  settingsQuery,
  uiStyleCookieName,
} from "@/lib/settings";
import { getCurrentVersion, getReleaseNotes } from "@/lib/release-notes";

export const dynamic = "force-dynamic";

export default async function ReleaseNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; ui?: string }>;
}) {
  const [{ lang, ui }, cookieStore] = await Promise.all([
    searchParams,
    cookies(),
  ]);
  const locale = resolveLocale(lang ?? cookieStore.get(localeCookieName)?.value);
  const uiStyle = resolveUiStyle(
    ui ?? cookieStore.get(uiStyleCookieName)?.value ?? defaultUiStyle,
  );
  const t = dictionaries[locale];
  const currentVersion = getCurrentVersion();
  const releaseNotes = getReleaseNotes();
  const query = settingsQuery({ lang: locale, style: uiStyle });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm">
        <Link
          href={`/?${query}`}
          className="text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]"
        >
          {t.backHome}
        </Link>
        <p className="mt-6 text-sm uppercase tracking-[0.35em] text-[var(--app-accent)]">
          {t.releaseNotes}
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              {t.releaseNotes}
            </h1>
            <p className="mt-3 max-w-2xl text-[var(--app-muted)]">
              {t.releaseNotesDescription}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-4 py-3 text-sm">
            <span className="block text-[var(--app-muted)]">
              {t.currentVersion}
            </span>
            <span className="font-semibold text-[var(--app-text)]">
              {currentVersion}
            </span>
          </div>
        </div>
      </header>

      {releaseNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-10 text-center text-[var(--app-muted)]">
          {t.noReleaseNotes}
        </div>
      ) : (
        <section className="space-y-4">
          {releaseNotes.map((release) => (
            <article
              key={release.version}
              className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">{release.version}</h2>
                  <p className="mt-1 text-sm text-[var(--app-muted)]">
                    {t.releasedOn}: {release.date || "-"}
                  </p>
                </div>
                <Link
                  href={`/release-notes/${encodeURIComponent(release.version)}?${query}`}
                  className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-muted-surface)]"
                >
                  {t.viewRelease}
                </Link>
              </div>

              <ul className="mt-5 space-y-2 text-sm text-[var(--app-muted)]">
                {release.commits.slice(0, 5).map((commit) => (
                  <li key={commit.hash}>
                    <span className="font-mono text-xs text-[var(--app-accent)]">
                      {commit.shortHash}
                    </span>{" "}
                    {commit.subject}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
