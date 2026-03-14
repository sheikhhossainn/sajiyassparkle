# Unit Testing Report

## Overview
This project now has an initial unit testing setup using Vitest.

The goal of this first phase was to:
- establish a working test runner
- extract core business logic into testable utility modules
- validate the most important category and wishlist logic with fast unit tests

## Testing Setup

### Tooling
- Test framework: Vitest
- Scripts:
  - `npm test` -> runs all unit tests once
  - `npm run test:watch` -> runs tests in watch mode

### Package Changes
- Added dev dependency:
  - `vitest`
- Updated scripts in `package.json`

## What Was Tested

### 1) Category Logic Tests
File: `frontend/js/utils/category-utils.test.js`

Covered functions:
- `normalizeCategory(rawCategory)`
- `categoryMatches(productCategory, selectedCategory)`
- `formatCategoryLabel(category)`

Test coverage focus:
- normalization of singular/plural and prefixed categories
- exact category matching behavior
- display label formatting for known and unknown categories

### 2) Wishlist Logic Tests
File: `frontend/js/utils/wishlist-utils.test.js`

Covered functions:
- `mapWishlistRowsToItems(rows)`
- `getWishlistCountLabel(itemCount)`
- `getWishlistImageUrl(item)`

Test coverage focus:
- mapping Supabase join results into UI-friendly wishlist items
- fallback/default value behavior for missing fields
- count label rendering rules
- image URL fallback order

## Refactoring Done for Testability
To support reliable unit testing, logic was extracted into pure utility modules:
- `frontend/js/utils/category-utils.js`
- `frontend/js/utils/wishlist-utils.js`

Then production files were updated to consume those helpers:
- `frontend/js/collections.js`
- `frontend/js/wishlist.js`

This improves maintainability and makes behavior easier to verify with automated tests.

## Latest Test Results
Last run command:
- `npm test`

Result:
- Test Files: 2 passed
- Tests: 10 passed
- Failures: 0

Breakdown:
- `frontend/js/utils/category-utils.test.js`: 6 passed
- `frontend/js/utils/wishlist-utils.test.js`: 4 passed

## Current Scope and Limitations
What is covered now:
- key category filtering/label logic
- wishlist mapping and display helpers

What is not yet covered:
- DOM rendering integration behavior
- Supabase network interaction edge cases via mocks
- cart merge/add logic
- auth-driven UI transitions
- admin flows and order workflows

## Future Testing Plan

### Phase 1: Expand Core Unit Logic
1. Add cart utility functions and tests:
   - add item to cart
   - increment quantity for existing item
   - stock and duplicate handling rules
2. Add tests for product sorting and price filtering helpers.
3. Add tests for pagination helpers.

### Phase 2: Service and Error Handling Tests
1. Introduce mocked Supabase calls for:
   - wishlist insert/delete/load success and failure cases
   - featured product fetch fallback logic
2. Validate user-facing error messaging paths.

### Phase 3: DOM/Integration Testing
1. Add lightweight component/page integration tests with jsdom:
   - collections filtering UI behavior
   - wishlist empty vs non-empty rendering
2. Verify event wiring for add-to-cart and wishlist buttons.

### Phase 4: End-to-End Confidence
1. Add E2E smoke tests for critical journeys:
   - login -> add to wishlist -> view wishlist -> add to cart
   - category filter + sort + pagination flow
2. Run E2E tests in CI on pull requests.

## Recommended Quality Gates
For upcoming development cycles, use these guardrails:
- all unit tests pass before merge
- no reduction in covered core utility functions
- add at least one test for every new business rule
- keep tests deterministic and isolated from external services by default

## How to Run
From project root:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```
