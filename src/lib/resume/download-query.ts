/** Query string for the resume download/print page (template + font + locale/theme). */
export function downloadPageQuery(input: {
  template: string;
  font: string;
  settingsQuery: string;
}) {
  const params = new URLSearchParams(input.settingsQuery);
  params.set("template", input.template);
  params.set("font", input.font);
  return params.toString();
}
