"use server";

import { redirect } from "next/navigation";

import { createResume } from "@/lib/db/resume-repository";
import { dictionaries, resolveLocale } from "@/lib/i18n";
import { resolveUiStyle, settingsQuery } from "@/lib/settings";

export async function createResumeAction(formData: FormData) {
  const locale = resolveLocale(String(formData.get("lang") ?? ""));
  const uiStyle = resolveUiStyle(String(formData.get("ui") ?? ""));
  const t = dictionaries[locale];
  const title = String(formData.get("title") ?? t.defaultResumeTitle).trim();
  const id = await createResume(title || t.defaultResumeTitle);

  redirect(`/resumes/${id}?${settingsQuery({ lang: locale, style: uiStyle })}`);
}
