## 1. Runtime diagnosis

- [x] 1.1 Add debug instrumentation on confirm apply, client confirm handler, and workspace resume refresh
- [x] 1.2 Reproduce the confirm-success / content-unchanged bug and capture NDJSON logs
- [x] 1.3 Evaluate hypotheses (item merge no-op, UI stale, empty/wrong patches, client overwrite)

## 2. Fix

- [x] 2.1 Implement the minimal fix supported by log evidence
- [x] 2.2 Keep instrumentation for a post-fix verification run
- [x] 2.3 Add/adjust Vitest coverage for the confirmed root cause

## 3. Cleanup

- [x] 3.1 Remove debug instrumentation after verified success
- [x] 3.2 Sync docs if user-facing AI confirm behavior changes
