## Purpose

Defines AI Edit/Plan outcomes as first-class generated artifacts (生成产物)
with identity, lifecycle status, and linkage to resumes and proposals—not only
ephemeral pending chat proposals.

## ADDED Requirements

### Requirement: AI changes are generated artifacts

The system SHALL represent each Edit/Plan patch proposal as a generated
artifact with a stable identifier, resume association, proposal linkage,
creation time, and status among `pending`, `applied`, `rejected`, and `undone`.

#### Scenario: Proposal becomes a pending artifact

- **WHEN** the assistant emits a successful `proposal_ready` for Edit or Plan
  execution
- **THEN** the system creates or updates a generated artifact in `pending`
  status linked to that proposal and resume

#### Scenario: Confirm transitions artifact status

- **WHEN** the user confirms a pending proposal successfully
- **THEN** the corresponding artifact status becomes `applied`

#### Scenario: Reject transitions artifact status

- **WHEN** the user rejects a pending proposal
- **THEN** the corresponding artifact status becomes `rejected`

### Requirement: Artifacts remain queryable after the chat proposal clears

After a proposal is confirmed or rejected, the system SHALL retain the
generated artifact in local storage so history and review do not depend on
`pending_proposal` remaining on the chat session.

#### Scenario: History after confirm

- **WHEN** a user has confirmed an AI change and the pending proposal is cleared
- **THEN** the applied artifact remains available for listing and detail view
  for that resume
