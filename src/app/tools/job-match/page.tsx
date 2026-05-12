import Link from "next/link";
import { cookies } from "next/headers";

import { createJobDescriptionAction } from "@/app/actions";
import { JobMatchTool } from "@/components/job-match/job-match-tool";
import { listJobDescriptions } from "@/lib/db/job-description-repository";
import { listResumes } from "@/lib/db/resume-repository";
import { dictionaries, resolveLocale } from "@/lib/i18n";
import {
  defaultUiStyle,
  localeCookieName,
  resolveUiStyle,
  settingsQuery,
  uiStyleCookieName,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function JobMatchPage({
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
  const query = settingsQuery({ lang: locale, style: uiStyle });
  const [jobDescriptions, resumes] = await Promise.all([
    listJobDescriptions(),
    listResumes(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm">
        <Link
          href={`/?${query}`}
          className="text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]"
        >
          {t.backHome}
        </Link>
        <p className="mt-6 text-sm uppercase tracking-[0.35em] text-[var(--app-accent)]">
          {t.tools}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {t.jobMatchToolName}
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--app-muted)]">
          {t.jobMatchToolDescription}
        </p>
      </header>

      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">{t.saveJd}</h2>
        <form action={createJobDescriptionAction} className="mt-5 space-y-4">
          <input type="hidden" name="lang" value={locale} />
          <input type="hidden" name="ui" value={uiStyle} />
          <label className="block text-sm font-medium text-[var(--app-muted)]">
            {t.jdTitle}
            <input
              name="title"
              required
              placeholder={t.jdTitlePlaceholder}
              className="mt-2 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            />
          </label>
          <label className="block text-sm font-medium text-[var(--app-muted)]">
            {t.jdContent}
            <textarea
              name="content"
              required
              rows={10}
              placeholder={t.jdContentPlaceholder}
              className="mt-2 w-full resize-y rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            />
          </label>
          <button className="rounded-lg bg-[var(--app-primary)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--app-primary-hover)]">
            {t.saveJd}
          </button>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{t.savedJds}</h2>
          <span className="text-sm text-[var(--app-muted)]">
            {jobDescriptions.length}
          </span>
        </div>
        {jobDescriptions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center text-[var(--app-muted)]">
            {t.emptyJds}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {jobDescriptions.slice(0, 4).map((jobDescription) => (
              <article
                key={jobDescription.id}
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm"
              >
                <h3 className="font-semibold">{jobDescription.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--app-muted)]">
                  {jobDescription.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">{t.jobMatchScore}</h2>
        <JobMatchTool
          jobDescriptions={jobDescriptions}
          resumes={resumes}
          locale={locale}
          labels={{
            selectJd: t.selectJd,
            selectResume: t.selectResume,
            runJobMatch: t.runJobMatch,
            aiSending: t.aiSending,
            aiError: t.aiError,
            score: t.jobMatchScore,
            summary: t.jobMatchSummary,
            strengths: t.jobMatchStrengths,
            gaps: t.jobMatchGaps,
            suggestions: t.jobMatchSuggestions,
            needData: t.jobMatchNeedData,
          }}
        />
      </section>
    </main>
  );
}
