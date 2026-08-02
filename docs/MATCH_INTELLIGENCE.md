# Match Intelligence

## Routes

- `/match-intelligence`
- `/match-intelligence/:matchId`
- `/match-intelligence/live/:matchId`

## Levels

Level 1 Manual Assisted is the immediate functional target: teams, timeline, score, events, and statistics validated by the user.

Level 2 AI Suggestions can propose probable events, but the user must validate them.

Level 3 Automatic Intelligence remains architecture-only until a specialized model is trained and validated.

## Event Types

Possession, shot, rebound, assist, steal, turnover, block, fast break, foul, timeout, and substitution events are planned for the match event model.

## Current Engine

Sprint 6 adds `src/match-intelligence/matchIntelligenceEngine.ts`.

The engine builds an official match dashboard from manual or coach-validated events. Rejected suggestions are excluded from official score and statistics.

## Current UI

Routes:

- `/match-intelligence`
- `/match-intelligence/:matchId`
- `/match-intelligence/live/:matchId`

The UI includes manual event entry, timeline import, score, statistics, validation queue, and a live dashboard view.

## Limits

- Automatic match statistics remain locked until specialized models are trained and validated.
- AI suggestions require coach validation.
- Firestore persistence and video synchronization remain future work.
