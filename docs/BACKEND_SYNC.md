# Backend Persistence / Real Data Sync

Sprint 9 adds the shared backend sync layer in `src/backend-sync/backendSyncService.ts`.

## Synced Collections

- `coachComments`
- `coachDrawings`
- `trainingPlans`
- `aiCoachPlans`
- `clubs/{clubId}/snapshots`
- `clubs/{clubId}/reports`
- `scoutingReports`
- `eliteReports`
- `matchReports`
- `tournaments`
- `marketplaceDrafts`

## Behavior

Documents are wrapped in a shared sync envelope with:

- owner
- athlete
- coach
- club
- validation status
- payload
- timestamps

If Firestore is unavailable, the service queues the write in local storage under `basketmotion:backend-sync:queue`.

## Guardrails

- Coach writes require coach ownership.
- Club writes require club admin scope.
- Rejected or unvalidated AI suggestions should not be published as official reports.
- External integrations, payments, cloud jobs, and wearables remain `requires_configuration` until real providers are configured.

## Remaining

- UI for replaying queued offline writes.
- PDF report generation and Storage upload.
- Firestore indexes for production queries.
- Expanded emulator tests for every new Sprint 9 collection.
