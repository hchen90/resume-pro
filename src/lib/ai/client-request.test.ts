import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAiRequestController,
  getAiClientTimeoutMs,
  isAbortError,
} from "./client-request";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_AI_CLIENT_TIMEOUT_MS;
});

describe("getAiClientTimeoutMs", () => {
  it("uses distinct defaults per mode", () => {
    expect(getAiClientTimeoutMs("chat")).toBe(120_000);
    expect(getAiClientTimeoutMs("edit")).toBe(300_000);
    expect(getAiClientTimeoutMs("plan")).toBe(300_000);
  });

  it("honors a configured override", () => {
    process.env.NEXT_PUBLIC_AI_CLIENT_TIMEOUT_MS = "5000";
    expect(getAiClientTimeoutMs("chat")).toBe(5000);
  });

  it("ignores invalid overrides", () => {
    process.env.NEXT_PUBLIC_AI_CLIENT_TIMEOUT_MS = "-1";
    expect(getAiClientTimeoutMs("chat")).toBe(120_000);
  });
});

describe("isAbortError", () => {
  it("detects abort errors", () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    expect(isAbortError(error)).toBe(true);
    expect(isAbortError(new Error("other"))).toBe(false);
    expect(isAbortError("nope")).toBe(false);
  });
});

describe("createAiRequestController", () => {
  it("aborts and calls onTimeout when the timer fires", () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.fn(globalThis.setTimeout);
    const clearTimeoutSpy = vi.fn(globalThis.clearTimeout);
    vi.stubGlobal("window", {
      setTimeout: setTimeoutSpy,
      clearTimeout: clearTimeoutSpy,
    });

    const onTimeout = vi.fn();
    const controller = createAiRequestController({ mode: "chat", onTimeout });
    expect(controller.signal.aborted).toBe(false);

    vi.advanceTimersByTime(120_000);

    expect(onTimeout).toHaveBeenCalledOnce();
    expect(controller.signal.aborted).toBe(true);
    vi.useRealTimers();
  });

  it("supports manual abort and dispose", () => {
    const clearTimeoutSpy = vi.fn();
    vi.stubGlobal("window", {
      setTimeout: vi.fn(() => 1),
      clearTimeout: clearTimeoutSpy,
    });

    const controller = createAiRequestController({ mode: "edit" });
    controller.abort();
    expect(controller.signal.aborted).toBe(true);

    const second = createAiRequestController({ mode: "plan" });
    second.dispose();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
