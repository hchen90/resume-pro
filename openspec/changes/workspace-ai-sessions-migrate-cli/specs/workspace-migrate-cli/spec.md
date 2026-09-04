## Purpose

Provides a one-click CLI to migrate legacy database resumes, job descriptions,
and AI chat sessions into the workspace folder with a Git commit.

## ADDED Requirements

### Requirement: Migrate CLI command

The project SHALL expose an npm script that migrates database documents and AI
sessions into the workspace and creates a Git commit when changes are written.

#### Scenario: Run migrate script

- **WHEN** a user runs `npm run workspace:migrate` with a reachable legacy database
- **THEN** resumes, JDs, and AI sessions from the database appear under the
  workspace layout and a migration commit is created when data was written

#### Scenario: Force re-migrate

- **WHEN** a user runs the migrate script with `--force`
- **THEN** migration runs even if a prior migration marker exists
