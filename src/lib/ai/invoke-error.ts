export class AiInvokeError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, meta: { status?: number; code?: string } = {}) {
    super(message);
    this.name = "AiInvokeError";
    this.status = meta.status;
    this.code = meta.code;
  }
}

export function formatAiInvokeError(error: unknown): {
  message: string;
  status?: number;
  code?: string;
} {
  if (error instanceof AiInvokeError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
    };
  }

  const status = extractHttpStatus(error);
  const detail = extractErrorDetail(error);
  const code = extractErrorCode(error);

  let message = detail;
  if (status === 429) {
    message = `Rate limit exceeded (429)${detail ? `: ${detail}` : ""}`;
  } else if (status === 401 || status === 403) {
    message = `Authentication failed (${status})${detail ? `: ${detail}` : ""}`;
  } else if (status && status >= 500) {
    message = `Upstream service error (${status})${detail ? `: ${detail}` : ""}`;
  } else if (status) {
    message = `Request failed (${status})${detail ? `: ${detail}` : ""}`;
  }

  return { message, status, code };
}

function extractHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as {
    status?: unknown;
    response?: { status?: unknown };
    cause?: unknown;
  };

  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  if (candidate.response && typeof candidate.response === "object") {
    const status = (candidate.response as { status?: unknown }).status;
    if (typeof status === "number") {
      return status;
    }
  }

  if (candidate.cause) {
    return extractHttpStatus(candidate.cause);
  }

  const message = extractErrorDetail(error);
  const match = message.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function extractErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as {
    code?: unknown;
    error?: { code?: unknown; type?: unknown };
    cause?: unknown;
  };

  if (typeof candidate.code === "string") {
    return candidate.code;
  }

  if (candidate.error && typeof candidate.error === "object") {
    const nested = candidate.error;
    if (typeof nested.code === "string") {
      return nested.code;
    }
    if (typeof nested.type === "string") {
      return nested.type;
    }
  }

  if (candidate.cause) {
    return extractErrorCode(candidate.cause);
  }

  return undefined;
}

function extractErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === "string") {
    return error.trim();
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      error?: { message?: unknown };
      cause?: unknown;
    };

    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message.trim();
    }

    if (candidate.error && typeof candidate.error === "object") {
      const nestedMessage = (candidate.error as { message?: unknown }).message;
      if (typeof nestedMessage === "string" && nestedMessage.trim()) {
        return nestedMessage.trim();
      }
    }

    if (candidate.cause) {
      return extractErrorDetail(candidate.cause);
    }
  }

  return "Unknown error";
}
