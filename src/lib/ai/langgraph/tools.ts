import "server-only";

import { tool, type StructuredToolInterface } from "@langchain/core/tools";
import { z } from "zod";

import { summarizeResume } from "@/lib/ai/context";
import {
  assertNotCancelled,
  type AssistantRunContext,
} from "@/lib/ai/langgraph/run-context";
import { createSkillTool } from "@/lib/ai/langgraph/skill-tool";
import {
  aiPlanSchema,
  resumePatchSchema,
} from "@/lib/ai/patch";
import {
  assertPatchMatchesMutationClaims,
  summarizePatches,
  validateResumePatches,
} from "@/lib/ai/patch-validate";
import type { PendingPatchProposal } from "@/lib/ai/protocol";
import {
  formatSkillsCatalogPrompt,
  listConfiguredAgentSkills,
  resolveAgentSkillConfiguration,
} from "@/lib/ai/skills";

function toolJson(value: unknown) {
  return JSON.stringify(value);
}

export function createAssistantTools(
  context: AssistantRunContext,
): StructuredToolInterface[] {
  const getResumeContext = tool(
    () => {
      assertNotCancelled(context);
      return toolJson({
        resumeContext: summarizeResume(context.resume, context.selectedNodeId),
      });
    },
    {
      name: "get_resume_context",
      description:
        "Read the current resume structure (title, template, selected node, and all nodes).",
      schema: z.object({}),
    },
  );

  const getSelectedNode = tool(
    () => {
      assertNotCancelled(context);
      const selected = context.resume.nodes.find(
        (node) => node.id === context.selectedNodeId,
      );
      return toolJson({
        selectedNodeId: context.selectedNodeId ?? null,
        selectedNode: selected
          ? {
              id: selected.id,
              type: selected.type,
              title: selected.title,
              enabled: selected.enabled,
              content: selected.content,
            }
          : null,
      });
    },
    {
      name: "get_selected_node",
      description: "Read the currently selected resume node, if any.",
      schema: z.object({}),
    },
  );

  const draftResumePlan = tool(
    (input) => {
      assertNotCancelled(context);
      const parsed = z
        .object({
          message: z.string().min(1),
          plan: aiPlanSchema,
        })
        .parse(input);

      const knownNodeIds = new Set(context.resume.nodes.map((node) => node.id));
      const plan = {
        ...parsed.plan,
        steps: parsed.plan.steps.map((step) => ({
          ...step,
          targetNodeIds: step.targetNodeIds.filter((id) => knownNodeIds.has(id)),
        })),
      };

      context.plan = plan;
      context.planMessage = parsed.message;
      context.lastToolError = null;
      return toolJson({
        ok: true,
        message: parsed.message,
        plan,
      });
    },
    {
      name: "draft_resume_plan",
      description:
        "Draft a step-by-step resume improvement plan for user confirmation. Do not claim the resume was modified.",
      schema: z.object({
        message: z.string().min(1),
        plan: aiPlanSchema,
      }),
    },
  );

  const proposeResumePatch = tool(
    (input) => {
      assertNotCancelled(context);
      const parsed = z
        .object({
          message: z.string().min(1),
          patches: z.array(z.unknown()).min(1),
        })
        .parse(input);

      const validated = validateResumePatches(context.resume, parsed.patches);
      if (!validated.ok) {
        context.lastToolError = validated.issues
          .map((issue) => `patches[${issue.index}]: ${issue.message}`)
          .join("; ");
        return toolJson({
          ok: false,
          error: context.lastToolError,
        });
      }

      const intentError = assertPatchMatchesMutationClaims(
        parsed.message,
        validated.patches,
      );
      if (intentError) {
        context.lastToolError = intentError;
        return toolJson({
          ok: false,
          error: intentError,
        });
      }

      if (context.mode === "chat") {
        context.lastToolError =
          "propose_resume_patch is unavailable in chat mode.";
        return toolJson({ ok: false, error: context.lastToolError });
      }

      const proposal: PendingPatchProposal = {
        proposalId: crypto.randomUUID(),
        resumeId: context.resumeId,
        mode: context.mode,
        message: parsed.message,
        patches: validated.patches,
        summary: summarizePatches(context.resume, validated.patches),
        snapshotHash: context.snapshotHash,
        baseUpdatedAt: context.baseUpdatedAt,
        createdAt: new Date().toISOString(),
      };

      context.proposal = proposal;
      context.lastToolError = null;
      return toolJson({
        ok: true,
        proposalId: proposal.proposalId,
        summary: proposal.summary,
        message:
          "Patch proposal recorded. Wait for the user to confirm before assuming changes are saved.",
      });
    },
    {
      name: "propose_resume_patch",
      description:
        "Propose structured resume patches for user confirmation. Never apply patches yourself; the app saves only after the user confirms. Multi-item nodes upsert items by default; use removeItemIds to delete items or replaceItems=true with ordered content.items (id required; omitted fields are preserved on existing ids) to reorder/replace.",
      schema: z.object({
        message: z.string().min(1),
        patches: z.array(resumePatchSchema).min(1),
      }),
    },
  );

  const modeTools: StructuredToolInterface[] =
    context.mode === "chat"
      ? [getResumeContext, getSelectedNode]
      : context.mode === "plan" && context.action === "send"
        ? [getResumeContext, getSelectedNode, draftResumePlan]
        : [getResumeContext, getSelectedNode, proposeResumePatch];

  const skillConfiguration = resolveAgentSkillConfiguration();
  if (skillConfiguration.enabled) {
    const skills = listConfiguredAgentSkills(skillConfiguration);
    if (skills.length > 0) {
      modeTools.push(createSkillTool(context));
    }
  }

  return modeTools;
}

export function skillsSystemPromptSuffix() {
  const configuration = resolveAgentSkillConfiguration();
  if (!configuration.enabled) {
    return "";
  }

  return formatSkillsCatalogPrompt(listConfiguredAgentSkills(configuration));
}
