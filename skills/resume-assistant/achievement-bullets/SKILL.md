---
name: achievement-bullets
description: Rewrite resume experience and project bullets into concise, evidence-based achievement statements without inventing facts
---

# Achievement Bullets

Use this skill when the user asks to improve experience or project descriptions,
make bullets more impactful, or emphasize measurable outcomes.

## Workflow

1. Read the full resume context and identify the requested experience or project
   items.
2. Preserve all factual boundaries: employer, role, dates, technologies, scope,
   and outcomes must come from the resume or the user's message.
3. Structure each bullet as:
   - decisive action;
   - relevant task or technical approach;
   - business/user outcome when evidence exists.
4. Prefer concrete scale, latency, revenue, adoption, quality, or efficiency
   evidence already provided by the user.
5. If a metric is missing, improve specificity without fabricating a number.
   You may suggest the user provide a metric in chat, but never insert a
   placeholder into a patch.
6. Remove filler phrases, first-person pronouns, repeated responsibilities, and
   unsupported superlatives.

## Editing Rules

- Existing multi-item nodes must be edited through `content.items`.
- To update an existing item, preserve and send its real item `id`.
- Send only changed fields and changed items.
- Use `propose_resume_patch`; never claim that a proposal has been saved.

## Output Quality

- Start bullets with varied, role-appropriate action verbs.
- Keep one main result per bullet.
- Use Markdown bullets only inside description fields where appropriate.
- Match the language requested by the user.

## Limitations

- Never create achievements, metrics, clients, tools, or responsibilities that
  are not supported by the available context.
