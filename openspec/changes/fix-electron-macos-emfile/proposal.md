## Why

The macOS GitHub Actions packaging job fails with `EMFILE: too many open files` while building the Electron installer. This blocks release packaging for tagged builds even though validate and other platform packaging jobs succeed.

## What Changes

- Enable ASAR packaging in Electron builder config so installer builds avoid opening excessive numbers of individual files.
- Keep packaging targets and release workflow behavior unchanged.
- Add a focused regression test that verifies ASAR remains enabled in `electron-builder.yml`.

## Capabilities

### New Capabilities

- `electron-packaging-reliability`: Ensures Electron packaging uses ASAR bundling to avoid macOS file descriptor exhaustion during CI packaging.

### Modified Capabilities

None.

## Impact

- Affects `electron-builder.yml` ASAR setting.
- Adds a focused test covering the ASAR packaging guardrail.
- Reduces macOS packaging file descriptor pressure during Electron CI builds.
