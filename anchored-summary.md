## Objective
- Complete Office Branches feature: create, update, toggle, delete, password-set, resend-invite branches with sync between Offices/OfficeBranches tables; ensure branch works as independent office in existing app without modifying mobile app or parent office registration flow.
- Fix admin dashboard and offices listing to distinguish main offices from branches.

## Important Details
- `OfficeBranches` has two FK to `Offices`: `parent_office_id` (parent office) and `linked_office_id` (branch's own Office record).
- A branch is identified by: `OfficeBranches.linked_office_id = Offices.id`
- Branch Offices must NOT be deleted from Offices table (required for mobile app, login, cars).
- `commercial_registration_number = null` is a CONSEQUENCE of being a branch, not the definition.

## Work State
### Completed
- `branch-utils.service.ts` — reusable cached helper for `getBranchLinkedOfficeIds()` and `getActiveBranchesCount()`
- `analytics.service.ts` — `getDashboardStats()` excludes branch IDs from `totalOffices`, adds `activeBranches`
- `offices.service.ts` — `list()` excludes branch-linked offices via `not.in.()`
- `analytics-enhanced.service.ts` — `getPeriodData()` filters branches from newOffices; `getAllOfficesForReview()` excludes branches; `getGeoDistribution()` excludes branches from office counts
- `StatsGrid.tsx` — added `activeBranches` card (icon: Share2, violet gradient) after totalOffices
- `ar.ts`/`en.ts` — added `activeBranches` translation key
- `update-password/page.tsx` — rewritten with proper PKCE/hash token handling, session cleanup, Arabic error messages

### Active
- (none)

### Blocked
- (none)

## Relevant Files
- `src/services/branch-utils.service.ts` — `getBranchLinkedOfficeIds()`, `getActiveBranchesCount()`
- `src/services/analytics.service.ts` — office count excludes branches, activeBranches field
- `src/services/offices.service.ts` — list() excludes branches
- `src/services/analytics-enhanced.service.ts` — period/offices/review/geo exclude branches
- `src/components/dashboard/StatsGrid.tsx` — activeBranches card
- `src/i18n/ar.ts` + `src/i18n/en.ts` — activeBranches translation
- `src/app/auth/update-password/page.tsx` — PKCE + implicit flow recovery handling
