# BasketMotion AI Roadmap

## Sprint 1 - Rebrand + Foundation

- MasterHoop naming migrated to BasketMotion AI where safe.
- Legacy Firebase IDs and local browser keys remain compatible.
- Role-based navigation exposes athlete, coach, club, and admin routes.
- Migration documentation added.

## Sprint 2 - Coach

- Coach data models added for athlete profile, comments, drawings, drills, missions, plans, and AI Coach recommendations.
- Local storage service added for coach comments, drawings, drills, missions, and plans.
- Rule-based AI Coach refuses recommendations when observed data is insufficient.
- Tests added for comments, drawings, missions, and AI Coach confidence behavior.

## Sprint 3 - Club

- Dedicated Club Workspace page added.
- Local club service added for players, coaches, teams, matches, reports, CSV and JSON exports.
- Tests added for club metrics, filters, report generation, and exports.
- Remaining: Firestore-backed club players, coaches, teams, attendance, reports, and PDF export.

## Sprint 4 - AI Coach

- Added local AI Coach v4 engine.
- Added dedicated AI Coach page for `/app/coach-ia` and `/ai-coach`.
- Recommendations use observed sessions, confidence, objective, position, equipment, and weekly frequency.
- Insufficient data returns no assigned drills.
- Remaining: coach validation workflow and Firestore persistence for accepted plans.

## Sprint 5 - Elite Analytics

- Added local Elite Analytics engine.
- Added dedicated Elite Analytics page for `/elite`, `/elite/pose-comparison`, `/elite/scouting`, `/elite/team-analytics`, and `/elite/fatigue`.
- Reports include pose comparison, motion similarity, confidence-weighted scouting, fatigue trend, and team analytics.
- Scouting blocks output when data volume or confidence is insufficient.
- Remaining: coach-validated references, Firestore persistence, and licensed elite comparison datasets.

## Sprint 6 - Match Intelligence

- Added local Match Intelligence engine.
- Added dedicated Match Intelligence page for `/match-intelligence`, `/match-intelligence/:matchId`, and `/match-intelligence/live/:matchId`.
- Manual assisted timeline, event entry, score, statistics, validation queue, importer, and live dashboard are implemented.
- AI suggestions require coach validation before official reporting.
- Remaining: Firestore persistence, video sync, and validated specialized automatic match models.

## Sprint 7 - Ecosystem

- Added local Ecosystem service.
- Added dedicated Ecosystem page for `/tournaments`, `/marketplace`, `/training-generator`, `/integrations`, and `/integrations/wearables`.
- Tournament preview includes teams, bracket, results, and leaderboard.
- Marketplace preview includes free, club-only, premium, and requires-configuration states.
- AI training generator creates coach-validation-required weekly plans.
- Integrations and cloud jobs show `requires_configuration` when no provider backend exists.
- Remaining: Firestore tournaments, secure payments, provider OAuth, production cloud queues, and publishing workflows.

## Sprint 8 - Native / Research

- Added local Native / Research service.
- Added dedicated Native / Research page for `/research`, `/mobile`, and `/desktop`.
- Mobile, desktop, PWA, and wearable targets show preview or requires-configuration states.
- Research modules include multi-camera 3D reconstruction, markerless 3D pose, explainable AI, coach validation mode, anonymized analytics, and federated learning.
- Device benchmark plan lists metrics that must be measured on real devices.
- Remaining: Capacitor/Tauri projects, signing pipelines, provider bridges, validated datasets, and privacy-approved research exports.

## Sprint 9 - Backend Persistence / Real Data Sync

- Added shared backend sync service for coach, club, AI Coach, Elite, Match, Tournament, and Marketplace documents.
- Added Firestore sync envelopes with owner, athlete, coach, club, validation status, payload, and timestamps.
- Added offline fallback queue for failed backend writes.
- Added Firestore rules for new v4 persistence collections.
- Remaining: replay UI for queued writes, PDF export upload flow, production indexes, and expanded emulator coverage.

## Validation Policy

After each sprint, run the available scripts:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

Features that require a real backend, model, wearable provider, payment provider, or licensed reference must show preview, experimental, coming soon, or requires configuration states.
