## Purpose

Stores each resume’s AI chat session history as a workspace document beside that
resume so conversation state is local-first and not database-backed.

## ADDED Requirements

### Requirement: Session file per resume

The system SHALL persist the AI chat session for a resume at
`resumes/<resume-id>/ai/session.json` in the workspace.

#### Scenario: Save session writes workspace file

- **WHEN** the assistant saves a chat session for a resume
- **THEN** `resumes/<resume-id>/ai/session.json` is written with the session
  payload and no row is inserted into `ai_chat_sessions`

#### Scenario: Load session from workspace

- **WHEN** the assistant loads a chat session for a resume that has a session file
- **THEN** the session is restored from that file
