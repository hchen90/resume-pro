import { describe, expect, it } from "vitest";

import { downloadPageQuery } from "./download-query";

describe("downloadPageQuery", () => {
  it("includes template, font, and settings params", () => {
    const query = downloadPageQuery({
      template: "academic",
      font: "serif",
      settingsQuery: "lang=zh-CN&ui=github",
    });

    const params = new URLSearchParams(query);
    expect(params.get("template")).toBe("academic");
    expect(params.get("font")).toBe("serif");
    expect(params.get("lang")).toBe("zh-CN");
    expect(params.get("ui")).toBe("github");
  });
});
