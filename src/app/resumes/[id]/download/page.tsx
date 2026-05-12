import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/resume/print-button";
import { TemplateSelect } from "@/components/resume/template-select";
import { getResume } from "@/lib/db/resume-repository";
import { dictionaries, resolveLocale } from "@/lib/i18n";
import {
  defaultUiStyle,
  localeCookieName,
  resolveUiStyle,
  settingsQuery,
  uiStyleCookieName,
} from "@/lib/settings";
import { getResumeTemplate, resumeTemplates } from "@/templates/resume/registry";

type TemplateDescriptionId = keyof typeof dictionaries.en.templateDescriptions;

export default async function ResumeDownloadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string; lang?: string; ui?: string }>;
}) {
  const [{ id }, { template, lang, ui }, cookieStore] = await Promise.all([
    params,
    searchParams,
    cookies(),
  ]);
  const locale = resolveLocale(lang ?? cookieStore.get(localeCookieName)?.value);
  const uiStyle = resolveUiStyle(
    ui ?? cookieStore.get(uiStyleCookieName)?.value ?? defaultUiStyle,
  );
  const t = dictionaries[locale];
  const resume = await getResume(id);

  if (!resume) {
    notFound();
  }

  const selectedTemplate = getResumeTemplate(template ?? resume.templateId);
  const Template = selectedTemplate.component;
  const query = settingsQuery({ lang: locale, style: uiStyle });

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-6">
      <div className="no-print mb-6 flex w-full max-w-6xl flex-col gap-4 rounded-xl bg-[var(--app-surface)] p-4 shadow-sm ring-1 ring-[var(--app-border)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href={`/resumes/${resume.id}?${query}`}
            className="text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]"
          >
            {t.backToEdit}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{resume.title}</h1>
          <p className="text-sm text-[var(--app-muted)]">
            {t.currentTemplate}
            {selectedTemplate.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TemplateSelect
            resumeId={resume.id}
            selectedTemplateId={selectedTemplate.id}
            settingsQuery={query}
            label={t.defaultDownloadStyle}
            templates={resumeTemplates.map((item) => ({
              id: item.id,
              name: item.name,
              description:
                t.templateDescriptions[item.id as TemplateDescriptionId] ??
                item.description,
            }))}
          />
          <PrintButton label={t.printPdf} />
        </div>
      </div>

      <div className="print-page w-[794px] overflow-hidden bg-white shadow-2xl">
        <Template resume={{ ...resume, templateId: selectedTemplate.id }} />
      </div>
    </main>
  );
}
