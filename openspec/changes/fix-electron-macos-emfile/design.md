## Context

Electron packaging currently disables ASAR (`asar: false`) and writes the app payload as many individual files. On macOS CI, electron-builder fails with `EMFILE` while staging app files, indicating file descriptor exhaustion during packaging.

## Goals / Non-Goals

**Goals:**

- Reduce open-file pressure during macOS packaging by enabling ASAR bundling.
- Preserve existing packaged runtime behavior across platforms.
- Add a regression check that guards the ASAR setting.

**Non-Goals:**

- Changing release workflow structure, matrix, or publication behavior.
- Introducing platform-specific package layouts.
- Reworking Electron runtime bootstrap logic.

## Decisions

- Set `asar: true` in `electron-builder.yml` so app resources are bundled into an archive rather than copied as a large tree of loose files.
  - Alternative considered: raising `ulimit` further in CI. Rejected because the workflow already raises limits and this does not reduce packaging I/O pressure.
  - Alternative considered: trimming include globs. Rejected because it introduces more packaging-contract risk while the observed failure aligns directly with loose-file packaging overhead.
- Add a focused unit test that asserts ASAR remains enabled.
  - Alternative considered: no test, rely on CI only. Rejected because the setting is one-line and easy to accidentally revert.

## Risks / Trade-offs

- [Risk] Native module loading could be affected by ASAR packaging. → Mitigation: keep current rebuild/sync flow and validate packaging command locally.
- [Risk] Test may overconstrain future valid packaging changes. → Mitigation: assert only the ASAR requirement tied to this failure mode.

## Migration Plan

1. Update `electron-builder.yml` to enable ASAR.
2. Add regression test for the ASAR setting.
3. Run targeted test and `npm run build:electron -- --dir` for manual verification.
4. Keep rollback simple by restoring the previous ASAR setting if regressions appear.

## Open Questions

None.
