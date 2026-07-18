## ADDED Requirements

### Requirement: Track agent code modifications
The agent MUST create or select a matching OpenSpec change before creating,
editing, renaming, or deleting project code, tests, configuration, scripts,
migrations, or developer documentation.

#### Scenario: A code-editing request starts
- **WHEN** an agent is about to perform the first code modification for a user request
- **THEN** the agent creates or selects a matching active OpenSpec change before editing

#### Scenario: A read-only request runs
- **WHEN** an agent only reads, searches, explains, or executes checks without modifying files
- **THEN** the agent does not create an OpenSpec change

### Requirement: Keep implementation records current
The agent MUST update the selected change's artifacts when implementation
progress or material design decisions change.

#### Scenario: A logical implementation task completes
- **WHEN** an agent completes a logical implementation step
- **THEN** the corresponding OpenSpec task is immediately marked complete

#### Scenario: Implementation departs from the design
- **WHEN** implementation materially differs from an existing proposal, specification, or design
- **THEN** the agent updates the affected artifact before continuing

### Requirement: Validate tracked changes
The agent MUST strictly validate the selected OpenSpec change and report its
status before claiming the code modification is complete.

#### Scenario: Implementation is ready for handoff
- **WHEN** an agent has finished the requested code modifications
- **THEN** it runs strict OpenSpec validation and includes the change name and result in its summary

### Requirement: Preserve user control over archival
The agent MUST NOT archive an OpenSpec change unless the user requests or
explicitly confirms archival.

#### Scenario: A tracked implementation completes
- **WHEN** all implementation tasks are complete and validation passes
- **THEN** the change remains active until the user authorizes archival
