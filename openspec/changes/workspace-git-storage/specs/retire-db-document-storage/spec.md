## Purpose

Retires application-database persistence for resume and job-description user
documents so the workspace folder is the only durable store for that data.

## ADDED Requirements

### Requirement: Document saves do not use the app database

After cutover, creating, updating, or deleting resumes and job descriptions
SHALL NOT persist those documents into SQLite or Postgres application tables.

#### Scenario: Save resume without DB row write

- **WHEN** a resume is saved after workspace cutover
- **THEN** durability is achieved by workspace files (and Git commit), not by
  inserting or updating rows in `resumes` / `resume_nodes`

#### Scenario: Save JD without DB row write

- **WHEN** a job description is saved after workspace cutover
- **THEN** durability is achieved by workspace files (and Git commit), not by
  inserting or updating rows in `job_descriptions`

### Requirement: Migration from existing database

The system SHALL provide a migration path that exports existing database-stored
resumes and job descriptions into the workspace layout and creates an initial
Git commit before DB document storage is retired.

#### Scenario: Migrate then retire

- **WHEN** migration runs against a database that still contains resumes/JDs
- **THEN** those documents appear under the workspace `resumes/` and `jds/`
  trees and an initial commit exists, after which document APIs use the
  workspace only
