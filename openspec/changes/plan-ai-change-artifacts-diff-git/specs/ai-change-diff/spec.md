## Purpose

Lets users compare resume content before and after an AI change so they can
judge proposals against a concrete reference, not only summary counts.

## ADDED Requirements

### Requirement: Before/after comparison for pending proposals

When a pending AI change artifact exists, the system SHALL present a before
versus after comparison of affected resume content derived from the pre-change
state and the proposed patches.

#### Scenario: Review pending change with reference comparison

- **WHEN** the user views a pending Edit/Plan proposal in the assistant UI
- **THEN** the UI shows before and after content for affected nodes or fields
  (in addition to any summary counts)

#### Scenario: Unaffected content not required

- **WHEN** a proposal only touches a subset of nodes
- **THEN** the comparison MAY focus on affected nodes and MUST still show both
  before and after for each affected change presented

### Requirement: Before/after comparison for applied history

For an applied AI change artifact that retains before and after snapshots, the
system SHALL allow the user to reopen the same style of before/after comparison.

#### Scenario: Revisit applied change

- **WHEN** the user opens an applied AI change artifact from history
- **THEN** the system shows the stored before and after comparison for that
  change
