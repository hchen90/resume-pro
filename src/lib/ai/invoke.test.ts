import { describe, expect, it } from "vitest";

import { AiInvokeError, formatAiInvokeError } from "./invoke-error";

describe("formatAiInvokeError", () => {
  it("formats rate limit errors with status", () => {
    const formatted = formatAiInvokeError({
      status: 429,
      message: "Too many requests",
    });

    expect(formatted.status).toBe(429);
    expect(formatted.message).toContain("429");
    expect(formatted.message).toContain("Too many requests");
  });

  it("formats authentication errors", () => {
    const formatted = formatAiInvokeError({
      status: 401,
      message: "Invalid API key",
    });

    expect(formatted.message).toContain("401");
    expect(formatted.message).toContain("Invalid API key");
  });

  it("reads nested API error payloads", () => {
    const formatted = formatAiInvokeError({
      status: 503,
      error: {
        message: "Service unavailable",
        type: "server_error",
      },
    });

    expect(formatted.status).toBe(503);
    expect(formatted.code).toBe("server_error");
    expect(formatted.message).toContain("Service unavailable");
  });

  it("preserves AiInvokeError messages", () => {
    const formatted = formatAiInvokeError(
      new AiInvokeError("Upstream timeout", { status: 504 }),
    );

    expect(formatted.message).toBe("Upstream timeout");
    expect(formatted.status).toBe(504);
  });
});
