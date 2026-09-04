## Purpose

Versions the workspace with isomorphic-git: initialize the repo, auto-commit
document saves, and optionally generate commit messages with AI from the diff.

## ADDED Requirements

### Requirement: Workspace is a Git repository via isomorphic-git

The system SHALL manage the workspace as a Git repository using isomorphic-git
(not requiring a system `git` binary for save/commit).

#### Scenario: First use initializes Git

- **WHEN** the workspace is created or first saved and `.git` is absent
- **THEN** the system initializes a Git repository in the workspace root with
  isomorphic-git

### Requirement: Auto-commit on save

When the user saves (or an operation that persists documents completes, such as
a confirmed AI apply that writes files), the system SHALL stage the relevant
workspace changes and create a Git commit.

#### Scenario: Save creates a commit

- **WHEN** the user saves dirty workspace documents successfully
- **THEN** isomorphic-git creates a new commit containing those changes

### Requirement: AI-assisted commit messages from diff

The system SHALL generate the commit message using AI grounded in the workspace
Git diff when an AI provider is configured; otherwise it SHALL use a clear
deterministic fallback message.

#### Scenario: AI message when configured

- **WHEN** a save commit runs and AI is configured
- **THEN** the commit message reflects the diff summary produced for that
  change (or a short AI description of it)

#### Scenario: Fallback without AI

- **WHEN** a save commit runs and AI is unavailable or fails
- **THEN** the system still commits with a deterministic fallback message and
  does not fail the save solely because message generation failed
