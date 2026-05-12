"use server";

import { redirect } from "next/navigation";

import {
  createJobDescription,
  updateJobDescription,
} from "@/lib/db/job-description-repository";
import { createResume } from "@/lib/db/resume-repository";
import { dictionaries, resolveLocale } from "@/lib/i18n";
import { resolveUiStyle, settingsQuery } from "@/lib/settings";

export async function createResumeAction(formData: FormData) {
  const locale = resolveLocale(String(formData.get("lang") ?? ""));
  const uiStyle = resolveUiStyle(String(formData.get("ui") ?? ""));
  const t = dictionaries[locale];
  const title = String(formData.get("title") ?? t.defaultResumeTitle).trim();
  const id = await createResume(title || t.defaultResumeTitle, locale);

  redirect(`/resumes/${id}?${settingsQuery({ lang: locale, style: uiStyle })}`);
}

export async function createJobDescriptionAction(formData: FormData) {
  const locale = resolveLocale(String(formData.get("lang") ?? ""));
  const uiStyle = resolveUiStyle(String(formData.get("ui") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (title && content) {
    await createJobDescription({ title, content });
  }

  redirect(`/tools/job-match?${settingsQuery({ lang: locale, style: uiStyle })}`);
}

export async function updateJobDescriptionAction(formData: FormData) {
  const locale = resolveLocale(String(formData.get("lang") ?? ""));
  const uiStyle = resolveUiStyle(String(formData.get("ui") ?? ""));
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (id && title && content) {
    await updateJobDescription(id, { title, content });
  }

  redirect(
    `/tools/job-match/${id}?${settingsQuery({ lang: locale, style: uiStyle })}`,
  );
}
