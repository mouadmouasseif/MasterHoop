# BasketMotion AI Architecture

BasketMotion AI is a React/Vite application with Firebase authentication, Firestore, Storage, PWA support, local analysis tools, role-based routing, and AI analysis modules.

## Current App Flow

`src/main.tsx` installs `BrowserRouter`, runs legacy localStorage migration, and mounts `AuthProvider`.

`src/routes/AppRouter.tsx` declares public, athlete, coach, club, admin, elite, match intelligence, marketplace, tournament, integrations, research, and AI Coach routes.

`src/routes/AuthenticatedLayout.tsx` provides shared shell state and role-specific navigation.

## Target Domains

- `auth`
- `permissions`
- `coaches`
- `clubs`
- `teams`
- `analyses`
- `ai`
- `scouting`
- `match-intelligence`
- `training`
- `reports`
- `marketplace`
- `tournaments`
- `integrations`
- `wearables`
- `cloud`
- `mobile`
- `desktop`
- `shared`

## Brand and Migration

Shared naming lives in `src/shared/brand.ts`.

Legacy browser data migration lives in `src/shared/legacyMigration.ts`.

Firebase project IDs that still include the legacy `master-hoop` name are infrastructure compatibility values. Do not change them without a coordinated Firebase Auth, Firestore, Storage, rules, indexes, and environment migration.

## Safety Rules

BasketMotion AI must not present unconfigured cloud, wearable, payment, professional comparison, automatic scouting, automatic match statistics, or medical-risk features as complete.
