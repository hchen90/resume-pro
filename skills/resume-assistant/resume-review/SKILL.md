---
name: resume-review
description: Perform a structured, evidence-based resume review covering positioning, clarity, impact, consistency, and gaps
---

# Resume Review

Use this skill when the user requests a review, critique, diagnosis, scorecard,
or prioritized improvement plan for the whole resume.

## Review Sequence

1. Read the complete resume and selected node.
2. Determine the apparent target role only from explicit user context and resume
   evidence. If unclear, state the assumption or ask for the target role.
3. Review these dimensions:
   - positioning and summary;
   - relevance and prioritization;
   - achievement evidence;
   - clarity and concision;
   - consistency of dates, titles, and formatting;
   - skills supported by experience;
   - obvious missing context.
4. Separate factual defects from optional improvements.
5. Prioritize recommendations by expected hiring impact.

## Mode Behavior

- In chat mode, provide findings and recommendations only.
- In Plan mode, use `draft_resume_plan` with independent, selectable steps.
- In Edit mode, limit `propose_resume_patch` to changes explicitly requested by
  the user.

## Response Format

Keep the review compact:

1. Overall assessment
2. Highest-impact issues
3. Section-specific observations
4. Recommended next actions

## Safety

- Never infer protected characteristics.
- Never invent experience, credentials, awards, or metrics.
- Never claim edits were applied before user confirmation.
