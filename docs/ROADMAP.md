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

- Replace preview dashboards with Firestore-backed club players, coaches, teams, attendance, and reports.

## Sprint 4 - AI Coach

- Expand local rules engine with position, history, load, goals, confidence, and coach validation.

## Sprint 5 - Elite Analytics

- Add pose comparison, motion similarity, scouting reports, movement stability, fatigue trends, and team analytics.

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
