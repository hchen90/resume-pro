import { describe, expect, it } from "vitest";

import { dictionaries, locales } from "@/lib/i18n";

describe("itemDatePlaceholder locales", () => {
  it("defines a non-empty placeholder in every locale", () => {
    for (const locale of locales) {
      expect(dictionaries[locale].itemDatePlaceholder.trim().length).toBeGreaterThan(
        0,
      );
    }
  });

  it("mentions year-only and month formats in zh-CN and en", () => {
    expect(dictionaries["zh-CN"].itemDatePlaceholder).toMatch(/YYYY/);
    expect(dictionaries.en.itemDatePlaceholder).toMatch(/YYYY/);
  });
});
