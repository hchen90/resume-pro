## MODIFIED Requirements

### Requirement: Item date fields display year-only values

The resume node editor MUST display stored item `startDate` / `endDate` strings that are year-only (`YYYY`) or month-precision (`YYYY-MM`) without rendering them as empty controls, while using native month inputs for selection when possible.

#### Scenario: AI confirms year-only education dates

- **WHEN** an education item has `startDate` `2020` and `endDate` `2022` in resume state
- **THEN** the editor start/end month fields show a valid month value derived from those years (not blank)

#### Scenario: Month-precision dates still work

- **WHEN** an experience item has `startDate` `2024-01`
- **THEN** the editor start field shows `2024-01` in a month input

#### Scenario: User can pick a month from the control

- **WHEN** the user opens the start date control on a multi-item node
- **THEN** the browser month picker is available (`type="month"`)
