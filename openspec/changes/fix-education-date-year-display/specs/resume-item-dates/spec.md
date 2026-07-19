## ADDED Requirements

### Requirement: Item date fields display year-only values

The resume node editor MUST display stored item `startDate` / `endDate` strings that are year-only (`YYYY`) or month-precision (`YYYY-MM`) without rendering them as empty controls.

#### Scenario: AI confirms year-only education dates

- **WHEN** an education item has `startDate` `2020` and `endDate` `2022` in resume state
- **THEN** the editor start/end fields show `2020` and `2022` respectively

#### Scenario: Month-precision dates still work

- **WHEN** an experience item has `startDate` `2024-01`
- **THEN** the editor start field shows `2024-01`
