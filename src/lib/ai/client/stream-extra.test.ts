import { describe, expect, it } from "vitest";

import { readAssistantNdjsonStream } from "./stream";

function streamResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[index]));
      index += 1;
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

describe("readAssistantNdjsonStream edge cases", () => {
  it("throws when the response has no body", async () => {
    const response = new Response(null, { status: 204 });
    const iterator = readAssistantNdjsonStream(response);
    await expect(iterator.next()).rejects.toThrow("Streaming response body is missing.");
  });

  it("skips blank lines and parses a trailing event without a newline", async () => {
    const event = JSON.stringify({ type: "text_delta", runId: "r1", delta: "x" });
    const response = streamResponse(["\n\n", event]);

    const events = [];
    for await (const value of readAssistantNdjsonStream(response)) {
      events.push(value);
    }

    expect(events).toEqual([{ type: "text_delta", runId: "r1", delta: "x" }]);
  });
});
