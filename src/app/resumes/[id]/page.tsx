import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ResumeWorkspace } from "@/components/resume/resume-workspace";
import { getResume } from "@/lib/db/resume-repository";
import { resolveLocale } from "@/lib/i18n";
import {
  defaultUiStyle,
  localeCookieName,
  resolveUiStyle,
  uiStyleCookieName,
} from "@/lib/settings";

export default async function ResumeEditPage({
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
  const resume = await getResume(id);

  if (!resume) {
    notFound();
  }

  return (
    <ResumeWorkspace
      initialResume={resume}
      locale={resolveLocale(lang ?? cookieStore.get(localeCookieName)?.value)}
      uiStyle={resolveUiStyle(
        ui ?? cookieStore.get(uiStyleCookieName)?.value ?? defaultUiStyle,
      )}
    />
  );
}
