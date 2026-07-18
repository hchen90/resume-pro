import { EventType, type AgentEvent } from "@agentscope-ai/agentscope/event";

import type { AssistantRunContext } from "@/lib/ai/agentscope/run-context";
import type { AssistantStreamEvent } from "@/lib/ai/protocol";

export function mapAgentScopeEvent(
  event: AgentEvent,
  context: AssistantRunContext,
): AssistantStreamEvent[] {
  switch (event.type) {
    case EventType.TEXT_BLOCK_DELTA:
      return event.delta
        ? [{ type: "text_delta", runId: context.runId, delta: event.delta }]
        : [];
    case EventType.THINKING_BLOCK_DELTA:
      return event.delta
        ? [
            {
              type: "thinking_delta",
              runId: context.runId,
              delta: event.delta,
            },
          ]
        : [];
    case EventType.TOOL_CALL_START:
      context.activeTools.set(event.tool_call_id, event.tool_call_name);
      return [
        {
          type: "tool_started",
          runId: context.runId,
          toolName: event.tool_call_name,
          toolCallId: event.tool_call_id,
        },
      ];
    case EventType.TOOL_RESULT_START:
      context.activeTools.set(event.tool_call_id, event.tool_call_name);
      return [];
    case EventType.TOOL_RESULT_END: {
      const toolName =
        context.activeTools.get(event.tool_call_id) ?? "unknown_tool";
      context.activeTools.delete(event.tool_call_id);

      const mapped: AssistantStreamEvent[] = [
        {
          type: "tool_finished",
          runId: context.runId,
          toolName,
          toolCallId: event.tool_call_id,
          ok: event.state !== "error",
        },
      ];

      if (
        toolName === "draft_resume_plan" &&
        context.plan &&
        event.state !== "error"
      ) {
        mapped.push({
          type: "plan_ready",
          runId: context.runId,
          plan: context.plan,
          message: context.planMessage ?? "",
        });
      }

      if (
        toolName === "propose_resume_patch" &&
        context.proposal &&
        event.state !== "error"
      ) {
        mapped.push({
          type: "proposal_ready",
          runId: context.runId,
          proposal: context.proposal,
        });
      }

      if (event.state === "error" && context.lastToolError) {
        mapped.push({
          type: "error",
          runId: context.runId,
          message: context.lastToolError,
          fatal: false,
        });
      }

      return mapped;
    }
    case EventType.EXCEED_MAX_ITERS:
      return [
        {
          type: "error",
          runId: context.runId,
          message: "Assistant exceeded the maximum number of tool iterations.",
          fatal: true,
        },
      ];
    default:
      return [];
  }
}
