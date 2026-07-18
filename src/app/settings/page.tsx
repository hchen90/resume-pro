import { cookies } from "next/headers";

import { SettingsPage } from "@/components/settings-page";
import {
  listConfiguredAgentSkills,
  resolveAgentSkillConfiguration,
} from "@/lib/ai/agentscope/skills";
import { isElectronRuntime, readElectronAiConfig } from "@/lib/electron-env";
import { dictionaries, resolveLocale } from "@/lib/i18n";
import {
  defaultUiStyle,
  localeCookieName,
  resolveUiStyle,
  settingsQuery,
  uiStyleCookieName,
} from "@/lib/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SettingsRoute({
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
  const electronAiConfig = isElectronRuntime()
    ? readElectronAiConfig()
    : undefined;
  const skillConfiguration = resolveAgentSkillConfiguration();
  const skills = {
    enabled: skillConfiguration.enabled,
    skills: listConfiguredAgentSkills(skillConfiguration).map(
      ({ name, description, source }) => ({
        name,
        description,
        source,
      }),
    ),
  };

  return (
    <SettingsPage
      currentLocale={locale}
      currentUiStyle={uiStyle}
      settingsQuery={query}
      electronAiConfig={electronAiConfig}
      skills={skills}
      labels={{
        settings: t.settings,
        settingsDescription: t.settingsDescription,
        backHome: t.backHome,
        language: t.language,
        interfaceStyle: t.interfaceStyle,
        uiStyles: t.uiStyles,
        aiSettings: t.aiSettings,
        aiApiUrl: t.aiApiUrl,
        aiApiKey: t.aiApiKey,
        aiApiModel: t.aiApiModel,
        aiSummaryModel: t.aiSummaryModel,
        aiSummaryModelHint: t.aiSummaryModelHint,
        aiCustomApiUrl: t.aiCustomApiUrl,
        aiCustomProvider: t.aiCustomProvider,
        saveAiSettings: t.saveAiSettings,
        aiSettingsSaved: t.aiSettingsSaved,
        aiSettingsRestartRequired: t.aiSettingsRestartRequired,
        aiSettingsSaveFailed: t.aiSettingsSaveFailed,
        aiSkills: t.aiSkills,
        aiSkillsHint: t.aiSkillsHint,
        aiSkillsDisabled: t.aiSkillsDisabled,
        aiSkillsEmpty: t.aiSkillsEmpty,
        aiSkillsSearch: t.aiSkillsSearch,
        aiSkillsCount: t.aiSkillsCount(skills.skills.length),
        aiSkillsNoMatch: t.aiSkillsNoMatch,
        aiSkillSourceBundled: t.aiSkillSourceBundled,
        aiSkillSourceConfigured: t.aiSkillSourceConfigured,
      }}
    />
  );
}
