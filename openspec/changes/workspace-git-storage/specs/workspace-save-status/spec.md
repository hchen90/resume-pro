## Purpose

Surfaces workspace Git cleanliness in the UI: clean when everything is
committed, otherwise indicating the user can save.

## ADDED Requirements

### Requirement: Clean when fully committed

When the workspace has no uncommitted changes (relative to HEAD), the UI SHALL
indicate that the workspace is clean.

#### Scenario: After successful save commit

- **WHEN** a save completes and isomorphic-git status reports a clean tree
- **THEN** the UI marks the workspace as clean

### Requirement: Can-save when dirty

When the workspace has uncommitted changes (modified, staged, or untracked
tracked paths as defined by workspace status), the UI SHALL indicate that the
user can save.

#### Scenario: Edit without save

- **WHEN** the user edits a resume or JD in memory or on disk such that the
  workspace differs from HEAD
- **THEN** the UI marks that the workspace can be saved (not clean)

### Requirement: Save affordance matches status

The primary save control SHALL be enabled when the workspace can be saved and
SHALL be disabled or non-primary when the workspace is clean (unless a force
path is explicitly provided later).

#### Scenario: Save disabled when clean

- **WHEN** the workspace is clean
- **THEN** the primary save action is not offered as an active dirty-save
  action
