import Link from "next/link";
import { cookies } from "next/headers";

import { createResumeAction } from "@/app/actions";
import { SystemSettings } from "@/components/system-settings";
import { listResumes } from "@/lib/db/resume-repository";
import { dictionaries, resolveLocale } from "@/lib/i18n";
import { getCurrentVersion } from "@/lib/release-notes";
import {
  defaultUiStyle,
  localeCookieName,
  resolveUiStyle,
  settingsQuery,
  uiStyleCookieName,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Home({
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
  const resumes = await listResumes();
  const currentVersion = getCurrentVersion();
  const query = settingsQuery({ lang: locale, style: uiStyle });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/release-notes?${query}`}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-muted-surface)]"
        >
          <span>{t.releaseNotes}</span>
          <span className="text-[var(--app-muted)]">
            {t.currentVersion} {currentVersion}
          </span>
        </Link>
        <SystemSettings
          currentLocale={locale}
          currentUiStyle={uiStyle}
          labels={{
            settings: t.settings,
            language: t.language,
            interfaceStyle: t.interfaceStyle,
            uiStyles: t.uiStyles,
          }}
        />
      </div>
      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm">
        <p className="mb-3 text-sm uppercase tracking-[0.35em] text-[var(--app-accent)]">
          {t.appName}
        </p>
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
              {t.homeTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--app-muted)]">
              {t.homeDescription}
            </p>
          </div>
          <form
            action={createResumeAction}
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-muted-surface)] p-4 text-[var(--app-text)]"
          >
            <input type="hidden" name="lang" value={locale} />
            <input type="hidden" name="ui" value={uiStyle} />
            <label className="text-sm font-medium text-zinc-600" htmlFor="title">
              {t.newResumeTitle}
            </label>
            <input
              id="title"
              name="title"
              defaultValue={t.defaultResumeTitle}
              className="mt-2 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 outline-none focus:border-[var(--app-accent)]"
            />
            <button className="mt-4 w-full rounded-lg bg-[var(--app-primary)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--app-primary-hover)]">
              {t.createResume}
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">{t.tools}</h2>
        <Link
          href={`/tools/job-match?${query}`}
          className="block rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">{t.jobMatchToolName}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
                {t.jobMatchToolDescription}
              </p>
            </div>
            <span className="inline-flex rounded-lg bg-[var(--app-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--app-accent)] ring-1 ring-[var(--app-accent-border)]">
              {t.openTool}
            </span>
          </div>
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{t.myResumes}</h2>
          <span className="text-sm text-zinc-500">
            {t.resumeCount(resumes.length)}
          </span>
        </div>
        {resumes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-10 text-center text-[var(--app-muted)]">
            {t.emptyResumes}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => (
              <Link
                key={resume.id}
                href={`/resumes/${resume.id}?${query}`}
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="text-lg font-semibold">{resume.title}</div>
                <div className="mt-8 flex items-center justify-between text-sm text-zinc-500">
                  <span>
                    {t.templatePrefix}
                    {resume.templateId}
                  </span>
                  <span>
                    {new Date(resume.updatedAt).toLocaleDateString(locale)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
