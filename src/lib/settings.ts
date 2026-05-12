export const uiStyles = ["github", "warm", "slate"] as const;

export type UiStyle = (typeof uiStyles)[number];

export const defaultUiStyle: UiStyle = "github";

export const localeCookieName = "resume-pro-locale";
export const uiStyleCookieName = "resume-pro-ui-style";

export function resolveUiStyle(value?: string | null): UiStyle {
  return uiStyles.includes(value as UiStyle)
    ? (value as UiStyle)
    : defaultUiStyle;
}

export function settingsQuery(input: { lang: string; style: string }) {
  return `lang=${encodeURIComponent(input.lang)}&ui=${encodeURIComponent(
    input.style,
  )}`;
}
