import type { AssistantRunContext } from "@/lib/ai/langgraph/run-context";
import type { AssistantStreamEvent } from "@/lib/ai/protocol";

type StreamEventLike = {
  event: string;
  name?: string;
  run_id?: string;
  data?: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function extractTextDelta(chunk: unknown): string {
  const record = asRecord(chunk);
  if (!record) {
    return "";
  }

  const { content } = record;
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }
      const partRecord = asRecord(part);
      if (
        partRecord &&
        partRecord.type === "text" &&
        typeof partRecord.text === "string"
      ) {
        return partRecord.text;
      }
      return "";
    })
    .join("");
}

function extractThinkingDelta(chunk: unknown): string {
  const record = asRecord(chunk);
  if (!record) {
    return "";
  }

  const additional = asRecord(record.additional_kwargs);
  const reasoning = additional?.reasoning_content;
  if (typeof reasoning === "string") {
    return reasoning;
  }

  const { content } = record;
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      const partRecord = asRecord(part);
      if (
        partRecord &&
        (partRecord.type === "thinking" || partRecord.type === "reasoning") &&
        typeof partRecord.thinking === "string"
      ) {
        return partRecord.thinking;
      }
      if (
        partRecord &&
        (partRecord.type === "thinking" || partRecord.type === "reasoning") &&
        typeof partRecord.text === "string"
      ) {
        return partRecord.text;
      }
      return "";
    })
    .join("");
}

function toolCallIdFromData(data: Record<string, unknown> | undefined) {
  if (!data) {
    return "unknown";
  }

  if (typeof data.tool_call_id === "string") {
    return data.tool_call_id;
  }

  const input = asRecord(data.input);
  if (input && typeof input.tool_call_id === "string") {
    return input.tool_call_id;
  }

  const output = asRecord(data.output);
  if (output && typeof output.tool_call_id === "string") {
    return output.tool_call_id;
  }

  return typeof data.id === "string" ? data.id : "unknown";
}

function toolNameFromData(
  data: Record<string, unknown> | undefined,
  fallback: string,
) {
  if (!data) {
    return fallback;
  }
  if (typeof data.name === "string") {
    return data.name;
  }
  const input = asRecord(data.input);
  if (input && typeof input.name === "string") {
    return input.name;
  }
  return fallback;
}

function toolResultOk(data: Record<string, unknown> | undefined) {
  if (!data) {
    return true;
  }
  if (data.error) {
    return false;
  }
  const output = data.output;
  if (typeof output === "string") {
    try {
      const parsed = JSON.parse(output) as { ok?: boolean };
      if (typeof parsed.ok === "boolean") {
        return parsed.ok;
      }
    } catch {
      return true;
    }
  }
  const outputRecord = asRecord(output);
  if (outputRecord && typeof outputRecord.ok === "boolean") {
    return outputRecord.ok;
  }
  if (outputRecord && outputRecord.status === "error") {
    return false;
  }
  return true;
}

export function mapLangGraphStreamEvent(
  event: StreamEventLike,
  context: AssistantRunContext,
): AssistantStreamEvent[] {
  switch (event.event) {
    case "on_chat_model_stream": {
      const chunk = event.data?.chunk;
      const mapped: AssistantStreamEvent[] = [];
      const textDelta = extractTextDelta(chunk);
      if (textDelta) {
        mapped.push({
          type: "text_delta",
          runId: context.runId,
          delta: textDelta,
        });
      }
      const thinkingDelta = extractThinkingDelta(chunk);
      if (thinkingDelta) {
        mapped.push({
          type: "thinking_delta",
          runId: context.runId,
          delta: thinkingDelta,
        });
      }
      return mapped;
    }
    case "on_tool_start": {
      const toolName = toolNameFromData(event.data, event.name ?? "unknown_tool");
      const toolCallId = toolCallIdFromData(event.data);
      context.activeTools.set(toolCallId, toolName);
      return [
        {
          type: "tool_started",
          runId: context.runId,
          toolName,
          toolCallId,
        },
      ];
    }
    case "on_tool_end": {
      const toolCallId = toolCallIdFromData(event.data);
      const toolName =
        context.activeTools.get(toolCallId) ??
        toolNameFromData(event.data, event.name ?? "unknown_tool");
      context.activeTools.delete(toolCallId);
      const ok = toolResultOk(event.data);

      const mapped: AssistantStreamEvent[] = [
        {
          type: "tool_finished",
          runId: context.runId,
          toolName,
          toolCallId,
          ok,
        },
      ];

      if (toolName === "draft_resume_plan" && context.plan && ok) {
        mapped.push({
          type: "plan_ready",
          runId: context.runId,
          plan: context.plan,
          message: context.planMessage ?? "",
        });
      }

      if (toolName === "propose_resume_patch" && context.proposal && ok) {
        mapped.push({
          type: "proposal_ready",
          runId: context.runId,
          proposal: context.proposal,
        });
      }

      if (!ok && context.lastToolError) {
        mapped.push({
          type: "error",
          runId: context.runId,
          message: context.lastToolError,
          fatal: false,
        });
      }

      return mapped;
    }
    default:
      return [];
  }
}

export function mapGraphFatalError(
  error: unknown,
  context: AssistantRunContext,
): AssistantStreamEvent {
  const message =
    error instanceof Error ? error.message : "Assistant run failed.";

  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "GraphRecursionError"
  ) {
    return {
      type: "error",
      runId: context.runId,
      message: "Assistant exceeded the maximum number of tool iterations.",
      fatal: true,
    };
  }

  return {
    type: "error",
    runId: context.runId,
    message,
    fatal: true,
  };
}
