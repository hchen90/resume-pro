"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { languageName, type Locale, locales } from "@/lib/i18n";
import {
  localeCookieName,
  type UiStyle,
  uiStyleCookieName,
  uiStyles,
} from "@/lib/settings";

export type ElectronAiConfig = {
  aiApiUrl: string;
  aiApiKey: string;
  aiApiModel: string;
  aiSummaryModel: string;
};

export type AssistantSkill = {
  name: string;
  description: string;
  source: "bundled" | "configured";
};

export type SkillsPayload = {
  enabled: boolean;
  skills: AssistantSkill[];
};

type SettingsPageProps = {
  currentLocale: Locale;
  currentUiStyle: UiStyle;
  settingsQuery: string;
  electronAiConfig?: ElectronAiConfig;
  skills: SkillsPayload;
  labels: {
    settings: string;
    settingsDescription: string;
    backHome: string;
    language: string;
    interfaceStyle: string;
    uiStyles: Record<UiStyle, string>;
    aiSettings: string;
    aiApiUrl: string;
    aiApiKey: string;
    aiApiModel: string;
    aiSummaryModel: string;
    aiSummaryModelHint: string;
    aiCustomApiUrl: string;
    aiCustomProvider: string;
    saveAiSettings: string;
    aiSettingsSaved: string;
    aiSettingsRestartRequired: string;
    aiSettingsSaveFailed: string;
    aiSkills: string;
    aiSkillsHint: string;
    aiSkillsDisabled: string;
    aiSkillsEmpty: string;
    aiSkillsSearch: string;
    aiSkillsCount: string;
    aiSkillsNoMatch: string;
    aiSkillSourceBundled: string;
    aiSkillSourceConfigured: string;
  };
};

const cookieMaxAge = 60 * 60 * 24 * 365;
const aiProviderOptions = [
  {
    id: "openai",
    label: "OpenAI",
    apiUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    apiUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    apiUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  {
    id: "moonshot",
    label: "Moonshot AI / Kimi",
    apiUrl: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k",
  },
  {
    id: "siliconflow",
    label: "SiliconFlow",
    apiUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "Qwen/Qwen2.5-7B-Instruct",
  },
] as const;

const defaultModelNames = new Set<string>(
  aiProviderOptions.map((provider) => provider.defaultModel),
);

export function SettingsPage({
  currentLocale,
  currentUiStyle,
  settingsQuery,
  electronAiConfig,
  skills,
  labels,
}: SettingsPageProps) {
  const [aiConfig, setAiConfig] = useState(
    electronAiConfig ?? {
      aiApiUrl: "",
      aiApiKey: "",
      aiApiModel: "",
      aiSummaryModel: "",
    },
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [skillQuery, setSkillQuery] = useState("");
  const selectedAiProvider =
    aiProviderOptions.find((provider) => provider.apiUrl === aiConfig.aiApiUrl)
      ?.id ?? "custom";

  const filteredSkills = useMemo(() => {
    const query = skillQuery.trim().toLowerCase();
    if (!query) {
      return skills.skills;
    }

    return skills.skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query),
    );
  }, [skillQuery, skills.skills]);

  function updateSettings(next: { locale?: Locale; uiStyle?: UiStyle }) {
    const locale = next.locale ?? currentLocale;
    const uiStyle = next.uiStyle ?? currentUiStyle;
    const url = new URL(window.location.href);

    url.searchParams.set("lang", locale);
    url.searchParams.set("ui", uiStyle);
    document.cookie = `${localeCookieName}=${locale}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
    document.cookie = `${uiStyleCookieName}=${uiStyle}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
    document.documentElement.dataset.uiStyle = uiStyle;
    window.location.href = url.toString();
  }

  async function saveAiSettings() {
    setSaveState("saving");

    try {
      const response = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiConfig),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function updateAiProvider(providerId: string) {
    if (providerId === "custom") {
      setAiConfig((current) => ({
        ...current,
        aiApiUrl: "",
      }));
      setSaveState("idle");
      return;
    }

    const provider = aiProviderOptions.find((option) => option.id === providerId);

    if (!provider) {
      return;
    }

    setAiConfig((current) => ({
      ...current,
      aiApiUrl: provider.apiUrl,
      aiApiModel:
        current.aiApiModel === "" || defaultModelNames.has(current.aiApiModel)
          ? provider.defaultModel
          : current.aiApiModel,
    }));
    setSaveState("idle");
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm">
        <Link
          href={`/?${settingsQuery}`}
          className="text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]"
        >
          {labels.backHome}
        </Link>
        <p className="mt-6 text-sm uppercase tracking-[0.35em] text-[var(--app-accent)]">
          {labels.settings}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {labels.settings}
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--app-muted)]">
          {labels.settingsDescription}
        </p>
      </header>

      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">
          {labels.language}
        </h2>
        <label className="mt-4 block text-xs font-semibold text-[var(--app-muted)]">
          {labels.language}
          <select
            value={currentLocale}
            onChange={(event) =>
              updateSettings({ locale: event.target.value as Locale })
            }
            className="mt-2 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-3 py-2 text-sm font-medium text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
          >
            {locales.map((locale) => (
              <option key={locale} value={locale}>
                {languageName(locale)}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-xs font-semibold text-[var(--app-muted)]">
          {labels.interfaceStyle}
          <select
            value={currentUiStyle}
            onChange={(event) =>
              updateSettings({ uiStyle: event.target.value as UiStyle })
            }
            className="mt-2 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-3 py-2 text-sm font-medium text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
          >
            {uiStyles.map((style) => (
              <option key={style} value={style}>
                {labels.uiStyles[style]}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              {labels.aiSkills}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
              {labels.aiSkillsHint}
            </p>
          </div>
          {skills.enabled ? (
            <p className="text-sm text-[var(--app-muted)]">
              {labels.aiSkillsCount}
            </p>
          ) : null}
        </div>

        {!skills.enabled ? (
          <p className="mt-5 rounded-lg border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-4 py-3 text-sm leading-6 text-[var(--app-muted)]">
            {labels.aiSkillsDisabled}
          </p>
        ) : null}

        {skills.enabled && skills.skills.length === 0 ? (
          <p className="mt-5 rounded-lg border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-4 py-3 text-sm leading-6 text-[var(--app-muted)]">
            {labels.aiSkillsEmpty}
          </p>
        ) : null}

        {skills.enabled && skills.skills.length > 0 ? (
          <>
            <label className="mt-5 block text-xs font-semibold text-[var(--app-muted)]">
              {labels.aiSkillsSearch}
              <input
                value={skillQuery}
                onChange={(event) => setSkillQuery(event.target.value)}
                placeholder={labels.aiSkillsSearch}
                className="mt-2 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-3 py-2 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--app-accent)]"
              />
            </label>

            {filteredSkills.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-[var(--app-border)] px-4 py-6 text-center text-sm text-[var(--app-muted)]">
                {labels.aiSkillsNoMatch}
              </p>
            ) : (
              <ul className="mt-4 grid max-h-[28rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredSkills.map((skill) => (
                  <li
                    key={skill.name}
                    className="rounded-lg border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--app-text)]">
                        {skill.name}
                      </p>
                      <span className="shrink-0 rounded-full bg-[var(--app-surface)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--app-muted)] ring-1 ring-[var(--app-border)]">
                        {skill.source === "bundled"
                          ? labels.aiSkillSourceBundled
                          : labels.aiSkillSourceConfigured}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">
                      {skill.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </section>

      {electronAiConfig ? (
        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--app-text)]">
            {labels.aiSettings}
          </h2>
          <label className="mt-4 block text-xs font-medium text-[var(--app-muted)]">
            {labels.aiApiUrl}
            <select
              value={selectedAiProvider}
              onChange={(event) => updateAiProvider(event.target.value)}
              className="mt-2 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-3 py-2 text-sm font-medium text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            >
              {aiProviderOptions.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
              <option value="custom">{labels.aiCustomProvider}</option>
            </select>
          </label>
          {selectedAiProvider === "custom" ? (
            <label className="mt-3 block text-xs font-medium text-[var(--app-muted)]">
              {labels.aiCustomApiUrl}
              <input
                value={aiConfig.aiApiUrl}
                onChange={(event) =>
                  setAiConfig((current) => ({
                    ...current,
                    aiApiUrl: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              />
            </label>
          ) : null}
          <label className="mt-3 block text-xs font-medium text-[var(--app-muted)]">
            {labels.aiApiKey}
            <input
              type="password"
              value={aiConfig.aiApiKey}
              onChange={(event) =>
                setAiConfig((current) => ({
                  ...current,
                  aiApiKey: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            />
          </label>
          <label className="mt-3 block text-xs font-medium text-[var(--app-muted)]">
            {labels.aiApiModel}
            <input
              value={aiConfig.aiApiModel}
              onChange={(event) =>
                setAiConfig((current) => ({
                  ...current,
                  aiApiModel: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            />
          </label>
          <label className="mt-3 block text-xs font-medium text-[var(--app-muted)]">
            {labels.aiSummaryModel}
            <input
              value={aiConfig.aiSummaryModel}
              onChange={(event) =>
                setAiConfig((current) => ({
                  ...current,
                  aiSummaryModel: event.target.value,
                }))
              }
              placeholder={labels.aiSummaryModelHint}
              className="mt-2 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-3 py-2 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--app-accent)]"
            />
          </label>

          <button
            type="button"
            onClick={() => void saveAiSettings()}
            disabled={saveState === "saving"}
            className="mt-4 rounded-md bg-[var(--app-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {labels.saveAiSettings}
          </button>

          {saveState === "saved" ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              {labels.aiSettingsSaved} {labels.aiSettingsRestartRequired}
            </p>
          ) : null}
          {saveState === "error" ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
              {labels.aiSettingsSaveFailed}
            </p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
