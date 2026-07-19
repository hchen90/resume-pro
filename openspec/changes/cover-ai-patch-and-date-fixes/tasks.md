## 1. AI patch coverage

- [x] 1.1 Add regression tests for upsert-keep, removeItemIds+date update, year-only date apply
- [x] 1.2 Expand `assertPatchMatchesMutationClaims` and prompt contract tests

## 2. Date / i18n coverage

- [x] 2.1 Assert all locales expose `itemDatePlaceholder`
- [x] 2.2 Assert `itemDateRange` renders year-only dates

## 3. Verification

- [x] 3.1 Run `npm run test:coverage` and OpenSpec validate
