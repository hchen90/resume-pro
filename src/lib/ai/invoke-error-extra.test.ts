import { describe, expect, it } from "vitest";

import { formatAiInvokeError } from "./invoke-error";

describe("formatAiInvokeError status handling", () => {
  it("formats authentication (403) errors", () => {
    const formatted = formatAiInvokeError({ status: 403, message: "forbidden" });
    expect(formatted.message).toContain("403");
  });

  it("formats upstream 5xx errors", () => {
    const formatted = formatAiInvokeError({ status: 500, message: "boom" });
    expect(formatted.message).toContain("Upstream service error (500)");
  });

  it("formats other 4xx errors", () => {
    const formatted = formatAiInvokeError({ status: 400, message: "bad" });
    expect(formatted.message).toContain("Request failed (400)");
  });

  it("reads status from a response object", () => {
    const formatted = formatAiInvokeError({ response: { status: 429 } });
    expect(formatted.status).toBe(429);
  });

  it("extracts status from the error message text", () => {
    const formatted = formatAiInvokeError(new Error("Server said 503 unavailable"));
    expect(formatted.status).toBe(503);
  });

  it("recurses into cause for status, code, and detail", () => {
    const formatted = formatAiInvokeError({
      cause: { status: 401, code: "unauthorized", message: "nested detail" },
    });
    expect(formatted.status).toBe(401);
    expect(formatted.code).toBe("unauthorized");
    expect(formatted.message).toContain("nested detail");
  });

  it("reads a top-level string error", () => {
    const formatted = formatAiInvokeError("plain failure");
    expect(formatted.message).toBe("plain failure");
    expect(formatted.status).toBeUndefined();
  });

  it("reads nested error.message when top-level message is absent", () => {
    const formatted = formatAiInvokeError({ error: { message: "deep message" } });
    expect(formatted.message).toBe("deep message");
  });

  it("prefers nested error.code over type", () => {
    const formatted = formatAiInvokeError({ error: { code: "code_a", type: "type_b" } });
    expect(formatted.code).toBe("code_a");
  });

  it("falls back to Unknown error for opaque values", () => {
    const formatted = formatAiInvokeError({});
    expect(formatted.message).toBe("Unknown error");
    expect(formatted.status).toBeUndefined();
  });

  it("returns Unknown error for null", () => {
    const formatted = formatAiInvokeError(null);
    expect(formatted.message).toBe("Unknown error");
  });
});
