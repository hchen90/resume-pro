---
paths:
  - "src/components/resume/**/*.tsx"
---

<!-- Canonical source: .agents/rules/resume-form-controls.md -->

# Resume Form Control Semantics

- Preserve the intended semantic input type and native interaction. Date/month
  fields stay date/month pickers; numeric, color, email, URL, and similar fields
  must not be downgraded to plain text solely to accommodate stored data.
- Resolve incompatible values in the data boundary with normalization,
  migration, validation, or a tested adapter. Example: map stored `YYYY` to
  `YYYY-01` for `<input type="month">` instead of changing it to `type="text"`.
- Before changing an input type, verify browser behavior, keyboard and screen
  reader semantics, validation, persistence format, AI-generated values, and
  existing user data.
- A deliberate control-type change requires an explicit product requirement,
  updated frontend/resume documentation, and regression tests for both legacy
  values and new user input.
- Do not trade away user interaction to hide a formatting bug. Fix the format
  mismatch at its source or adapter layer.
