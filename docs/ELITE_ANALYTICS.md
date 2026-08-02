# Elite Analytics

## Routes

- `/elite`
- `/elite/pose-comparison`
- `/elite/scouting`
- `/elite/scouting/:athleteId`
- `/elite/team-analytics`
- `/elite/fatigue`

## Policy

BasketMotion AI does not compare athletes to professional players unless the reference is personal best, coach validated, or licensed.

Movement risk is presented as movement stability observation, not medical diagnosis.

## Current Engine

Sprint 5 adds `src/elite/eliteAnalyticsEngine.ts`.

The engine is local and confidence-weighted. It uses observed analyses, shot volume, confidence, strengths, weaknesses, recommendations, and shot metrics when available.

If data volume or confidence is below threshold, scouting output is blocked with `insufficient_data`.

## Current UI

Routes:

- `/elite`
- `/elite/pose-comparison`
- `/elite/scouting`
- `/elite/scouting/:athleteId`
- `/elite/team-analytics`
- `/elite/fatigue`

The UI shows similarity, scouting, fatigue trend, team analytics, confidence, data volume, and limitations.

## Remaining

- Licensed or coach-validated pose references.
- Firestore persistence for reports.
- Dynamic Time Warping over full pose sequences when frame-level reference clips are available.
