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

- Add manual assisted match importer, timeline, events, statistics, validation, and live dashboard.

## Sprint 7 - Ecosystem

- Add tournaments, marketplace, training generator, integrations architecture, and cloud job architecture.

## Sprint 8 - Native / Research

- Prepare mobile, desktop, wearables, and research preview modules.

## Validation Policy

After each sprint, run the available scripts:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

Features that require a real backend, model, wearable provider, payment provider, or licensed reference must show preview, experimental, coming soon, or requires configuration states.
