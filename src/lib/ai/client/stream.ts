import type { AssistantStreamEvent } from "@/lib/ai/protocol";

export async function* readAssistantNdjsonStream(
  response: Response,
): AsyncGenerator<AssistantStreamEvent> {
  if (!response.body) {
    throw new Error("Streaming response body is missing.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        yield JSON.parse(trimmed) as AssistantStreamEvent;
      }
    }

    const trailing = buffer.trim();
    if (trailing) {
      yield JSON.parse(trailing) as AssistantStreamEvent;
    }
  } finally {
    reader.releaseLock();
  }
}
