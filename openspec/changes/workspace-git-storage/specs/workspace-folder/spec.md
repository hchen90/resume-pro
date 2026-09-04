## Purpose

Defines the on-disk workspace folder as the human-clear home for resume and job
description documents stored as Markdown and/or JSON files.

## ADDED Requirements

### Requirement: Workspace root exists and is initialized

The system SHALL use a configurable workspace root directory as the store for
user documents and SHALL create the standard layout when the workspace is first
used.

#### Scenario: First launch creates layout

- **WHEN** the application needs to read or write user documents and the
  workspace root is missing or empty
- **THEN** the system creates the workspace root with a clear top-level layout
  including `resumes/` and `jds/` (and a short orientation README)

### Requirement: Resume documents on disk

The system SHALL persist each resume as a dedicated folder under `resumes/`
containing a canonical JSON document (and MAY include a Markdown projection and
metadata file).

#### Scenario: Save resume writes files

- **WHEN** a resume is saved successfully
- **THEN** the workspace contains an updated canonical resume JSON file under
  that resume’s folder

### Requirement: Job description documents on disk

The system SHALL persist each job description under `jds/` using Markdown for
the primary content and a metadata file for title and identifiers.

#### Scenario: Save JD writes files

- **WHEN** a job description is saved successfully
- **THEN** the workspace contains an updated Markdown JD document under that
  JD’s folder

### Requirement: Layout remains clear to humans

Workspace paths and filenames SHALL be stable and documented so a user can
browse the folder and understand which files are resumes versus JDs without
opening the database.

#### Scenario: Browse workspace

- **WHEN** a user opens the workspace folder in a file manager
- **THEN** resume and JD content are discoverable under distinct `resumes/` and
  `jds/` trees without inspecting SQLite or Postgres
