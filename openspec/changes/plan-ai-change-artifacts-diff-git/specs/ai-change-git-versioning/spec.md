## Purpose

Stores AI update documentation in local document data storage, records versions
with Git commits, and surfaces commit hashes in the product UI for each
versioned AI change.

## ADDED Requirements

### Requirement: Local document storage for AI updates

The system SHALL persist AI update documentation for each generated artifact in
local document data storage belonging to the application (not the product
source repository), addressable by artifact and resume.

#### Scenario: Document written on apply

- **WHEN** an AI change artifact transitions to `applied`
- **THEN** a local update document for that artifact is written or updated in
  the app’s local document storage

### Requirement: Git version recording

The system SHALL record versions of those local AI update documents using Git
commits in a dedicated local Git repository managed by the application.

#### Scenario: Commit created for applied update

- **WHEN** an applied AI update document is written successfully and Git is
  available
- **THEN** the system creates a Git commit for that update and associates the
  commit hash with the artifact

#### Scenario: Git unavailable

- **WHEN** Git is not available or the commit fails
- **THEN** the system MUST still persist the local document and artifact
  metadata, and MUST NOT fail the resume confirm solely because Git failed

### Requirement: UI displays Git commit hash

The system SHALL display the associated Git commit hash in the UI for artifacts
that have one (abbreviated form is acceptable if the full hash is available on
request or hover).

#### Scenario: Hash visible after apply

- **WHEN** an applied artifact has an associated commit hash
- **THEN** the assistant or AI change history UI shows that commit hash to the
  user
