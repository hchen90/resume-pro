## ADDED Requirements

### Requirement: Unit tests cover item delete and reorder patches

The test suite MUST verify that `removeItemIds` removes items, `replaceItems` replaces/reorders items, default upsert keeps omitted items, and mutation-claim validation rejects mismatched proposals.

#### Scenario: Upsert without remove keeps omitted duplicate

- **WHEN** an education node has two items and a patch updates/adds items without `removeItemIds` or `replaceItems`
- **THEN** tests assert both original item ids remain

#### Scenario: Intent validation rejects delete narrative without delete fields

- **WHEN** `assertPatchMatchesMutationClaims` receives a delete-claiming message with upsert-only patches
- **THEN** tests assert a non-null error referencing `removeItemIds` or `replaceItems`
