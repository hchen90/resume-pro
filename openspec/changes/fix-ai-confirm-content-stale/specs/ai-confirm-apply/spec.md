## ADDED Requirements

### Requirement: Confirmed patches update visible resume content

After the user confirms a pending AI patch proposal, the system MUST persist the applied resume and the editor MUST display the resulting node/item content from that saved resume.

#### Scenario: Confirm updates education items in the editor

- **WHEN** the user confirms a proposal whose patches change education items
- **THEN** the education section in the editor shows the post-apply items (including removals and order changes expressed by the patches)
- **AND** the assistant session records that changes were confirmed and saved

### Requirement: Item-level mutations are expressible and applied

The patch apply engine MUST support the item-level mutations the assistant is allowed to propose for multi-item nodes, including removing items and reordering items when those intents are encoded in the confirmed patches.

#### Scenario: Proposal removes a duplicate education item

- **WHEN** confirmed patches encode removal of one education item id from a node
- **THEN** that item MUST NOT appear in the saved resume or editor for that node

#### Scenario: Proposal reorders education items

- **WHEN** confirmed patches encode a new order for education items
- **THEN** the saved resume and editor MUST show items in that order
