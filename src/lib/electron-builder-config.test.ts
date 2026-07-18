import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("electron-builder config", () => {
  it("enables asar packaging to avoid excessive open-file pressure", () => {
    const configPath = path.resolve(process.cwd(), "electron-builder.yml");
    const config = fs.readFileSync(configPath, "utf8");

    expect(config).toMatch(/^asar:\s*true$/m);
    expect(config).not.toMatch(/^asar:\s*false$/m);
  });
});
