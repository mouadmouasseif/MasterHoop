# MasterHoop to BasketMotion AI Migration

## Names

- Legacy product names: MasterHoop, MasterHoop AI, masterhoop, master-hoop, MASTERHOOP.
- Current product name: BasketMotion AI.
- Current short name: BasketMotion.
- Current engine name: `basketmotion`.
- Legacy engine name kept for compatibility: `masterhoop`.

## Compatibility

Firebase project identifiers that still contain `master-hoop` are treated as legacy infrastructure and are not renamed automatically. Changing those values without a planned Firebase migration would break authentication, Firestore, Storage, and existing user data.

The app now copies supported legacy localStorage keys into new BasketMotion keys:

- `BasketMotion-AiAnalyses` to `basketmotion:analyses`
- `BasketMotion-AiFavoriteDrills` to `basketmotion:favorite-drills`
- `BasketMotion-AiDrillWatchHistory` to `basketmotion:drill-watch-history`
- `BasketMotion-AiInstallDismissed` to `basketmotion:install-dismissed`

Legacy QR links are still accepted:

- `BasketMotion-Ai://player/...`
- `MasterHoop://player/...`

New QR links use:

- `BasketMotion://player/...`

## Deployment Steps

1. Deploy the web app with the current Firebase config.
2. Confirm existing users can sign in and open old analyses.
3. Create a new Firebase project only if a separate infrastructure migration is required.
4. If Firebase is migrated, copy Auth users, Firestore collections, Storage files, rules, indexes, and environment variables together.
5. Keep legacy localStorage migration for at least one full release cycle.
