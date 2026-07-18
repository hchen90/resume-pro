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

describe("readAssistantNdjsonStream", () => {
  it("parses events across arbitrary chunk boundaries", async () => {
    const eventA = JSON.stringify({
      type: "run_started",
      runId: "r1",
      mode: "chat",
      action: "send",
    });
    const eventB = JSON.stringify({
      type: "text_delta",
      runId: "r1",
      delta: "hi",
    });
    const payload = `${eventA}\n${eventB}\n`;
    const mid = Math.floor(payload.length / 2);
    const response = streamResponse([payload.slice(0, mid), payload.slice(mid)]);

    const events = [];
    for await (const event of readAssistantNdjsonStream(response)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "run_started", runId: "r1", mode: "chat", action: "send" },
      { type: "text_delta", runId: "r1", delta: "hi" },
    ]);
  });
});
