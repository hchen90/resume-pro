"use client";

import { useState } from "react";

import { languageName, type Locale, locales } from "@/lib/i18n";
import {
  localeCookieName,
  type UiStyle,
  uiStyleCookieName,
  uiStyles,
} from "@/lib/settings";

type ElectronAiConfig = {
  aiApiUrl: string;
  aiApiKey: string;
  aiApiModel: string;
  aiSummaryModel: string;
};

type SystemSettingsProps = {
  currentLocale: Locale;
  currentUiStyle: UiStyle;
  electronAiConfig?: ElectronAiConfig;
  labels: {
    settings: string;
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

export function SystemSettings({
  currentLocale,
  currentUiStyle,
  electronAiConfig,
  labels,
}: SystemSettingsProps) {
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
  const selectedAiProvider =
    aiProviderOptions.find((provider) => provider.apiUrl === aiConfig.aiApiUrl)
      ?.id ?? "custom";

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
    <details className="group relative inline-block text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-muted-surface)] [&::-webkit-details-marker]:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--app-accent-soft)] text-[var(--app-accent)] ring-1 ring-[var(--app-accent-border)]">
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="currentColor"
          >
            <path d="M8 1.75a.75.75 0 0 1 .75.75v.51a5.5 5.5 0 0 1 1.35.56l.36-.36a.75.75 0 1 1 1.06 1.06l-.36.36c.25.42.44.88.56 1.35h.51a.75.75 0 0 1 0 1.5h-.51a5.5 5.5 0 0 1-.56 1.35l.36.36a.75.75 0 0 1-1.06 1.06l-.36-.36a5.5 5.5 0 0 1-1.35.56v.51a.75.75 0 0 1-1.5 0v-.51a5.5 5.5 0 0 1-1.35-.56l-.36.36a.75.75 0 0 1-1.06-1.06l.36-.36a5.5 5.5 0 0 1-.56-1.35H3.75a.75.75 0 0 1 0-1.5h.51c.12-.47.31-.93.56-1.35l-.36-.36a.75.75 0 0 1 1.06-1.06l.36.36c.42-.25.88-.44 1.35-.56V2.5A.75.75 0 0 1 8 1.75Zm0 3.5a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z" />
          </svg>
        </span>
        <span className="font-medium">{labels.settings}</span>
        <span className="text-xs text-[var(--app-muted)] transition group-open:rotate-180">
          v
        </span>
      </summary>

      <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-xl">
        <label className="block text-xs font-semibold text-[var(--app-muted)]">
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

        {electronAiConfig ? (
          <div className="mt-4 border-t border-[var(--app-border)] pt-4">
            <p className="text-xs font-semibold text-[var(--app-muted)]">
              {labels.aiSettings}
            </p>
            <label className="mt-3 block text-xs font-medium text-[var(--app-muted)]">
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
              className="mt-3 w-full rounded-md bg-[var(--app-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
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
          </div>
        ) : null}
      </div>
    </details>
  );
}
