---
name: ats-optimization
description: Improve resume structure and wording for applicant tracking systems while preserving truthful human-readable content
---

# ATS Optimization

Use this skill for ATS compatibility checks, keyword alignment, scannability,
section naming, and machine-readable resume improvements.

## Workflow

1. Read the entire resume before recommending changes.
2. Identify standard sections and verify that titles clearly describe their
   content.
3. Prefer conventional role names, technologies, skills, and domain terms that
   are already supported by the resume or the user's supplied job description.
4. Place important terms naturally in the summary, skills, and relevant
   experience/project items. Do not keyword-stuff.
5. Improve chronology, consistency, concise wording, and information density.
6. Keep contact information and profile data structured in the profile node.

## Editing Rules

- Do not invent keywords merely because they are common in a target role.
- Do not add proficiency claims that the user did not provide.
- Do not duplicate the same keyword across unrelated sections.
- Prefer semantic content changes over cosmetic template changes.
- Use `propose_resume_patch` for modifications and wait for confirmation.

## Review Checklist

- Standard, descriptive section titles
- Consistent dates and role naming
- Relevant hard skills in context
- Clear action-and-result bullets
- No tables or decorative content embedded in text fields
- No hidden keywords, filler blocks, or misleading claims

## Limitations

ATS behavior differs by vendor. Do not promise a score, guaranteed parsing, or
guaranteed interview results.
