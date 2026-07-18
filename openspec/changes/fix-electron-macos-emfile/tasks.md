## 1. Root Cause Confirmation

- [x] 1.1 Confirm the macOS packaging failure mode from GitHub Actions logs and map it to Electron packaging inputs

## 2. Packaging Scope Fix

- [x] 2.1 Enable ASAR in Electron builder configuration to reduce loose-file packaging pressure on macOS

## 3. Regression Coverage and Verification

- [x] 3.1 Add a focused test that validates ASAR remains enabled in Electron builder config
- [x] 3.2 Run targeted tests and Electron packaging verification commands for the changed area
