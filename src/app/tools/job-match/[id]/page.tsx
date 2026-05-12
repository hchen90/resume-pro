import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { updateJobDescriptionAction } from "@/app/actions";
import { getJobDescription } from "@/lib/db/job-description-repository";
import { dictionaries, resolveLocale } from "@/lib/i18n";
import {
  defaultUiStyle,
  localeCookieName,
  resolveUiStyle,
  settingsQuery,
  uiStyleCookieName,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function JobDescriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; ui?: string }>;
}) {
  const [{ id }, { lang, ui }, cookieStore] = await Promise.all([
    params,
    searchParams,
    cookies(),
  ]);
  const locale = resolveLocale(lang ?? cookieStore.get(localeCookieName)?.value);
  const uiStyle = resolveUiStyle(
    ui ?? cookieStore.get(uiStyleCookieName)?.value ?? defaultUiStyle,
  );
  const t = dictionaries[locale];
  const query = settingsQuery({ lang: locale, style: uiStyle });
  const jobDescription = await getJobDescription(id);

  if (!jobDescription) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm">
        <Link
          href={`/tools/job-match?${query}`}
          className="text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]"
        >
          {t.backToJobMatch}
        </Link>
        <p className="mt-6 text-sm uppercase tracking-[0.35em] text-[var(--app-accent)]">
          {t.jobMatchToolName}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {t.editJd}
        </h1>
        <p className="mt-3 text-sm text-[var(--app-muted)]">
          {new Date(jobDescription.updatedAt).toLocaleString(locale)}
        </p>
      </header>

      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <form action={updateJobDescriptionAction} className="space-y-4">
          <input type="hidden" name="id" value={jobDescription.id} />
          <input type="hidden" name="lang" value={locale} />
          <input type="hidden" name="ui" value={uiStyle} />
          <label className="block text-sm font-medium text-[var(--app-muted)]">
            {t.jdTitle}
            <input
              name="title"
              required
              defaultValue={jobDescription.title}
              className="mt-2 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            />
          </label>
          <label className="block text-sm font-medium text-[var(--app-muted)]">
            {t.jdContent}
            <textarea
              name="content"
              required
              rows={18}
              defaultValue={jobDescription.content}
              className="mt-2 w-full resize-y rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            />
          </label>
          <button className="rounded-lg bg-[var(--app-primary)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--app-primary-hover)]">
            {t.updateJd}
          </button>
        </form>
      </section>
    </main>
  );
}
