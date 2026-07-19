## ADDED Requirements

### Requirement: Year-only dates survive patch apply and locale placeholders exist

Year-only education dates MUST be preservable through `applyResumePatches`, and every UI locale MUST define `itemDatePlaceholder` for the text date inputs.

#### Scenario: Patch applies YYYY start and end dates

- **WHEN** `applyResumePatches` updates an education item with `startDate` `2020` and `endDate` `2022`
- **THEN** the resulting item content retains those exact strings

#### Scenario: All locales define date placeholder

- **WHEN** each locale dictionary is inspected
- **THEN** `itemDatePlaceholder` is a non-empty string
