## ADDED Requirements

### Requirement: Electron packaging SHALL enable ASAR bundling
Electron packaging configuration MUST enable ASAR bundling so installer builds do not stage the full app payload as loose files.

#### Scenario: ASAR remains enabled in Electron builder configuration
- **WHEN** Electron builder loads the packaging configuration
- **THEN** the Electron builder configuration MUST set `asar` to `true`
