# Club Platform

## Active Routes

- `/club`
- `/club/players`
- `/club/coaches`
- `/club/teams`
- `/club/matches`
- `/club/training`
- `/club/performance`
- `/club/reports`
- `/club/settings`

## Active Foundation

Sprint 3 now includes a dedicated Club Workspace page and local service foundation:

- Club players
- Club coaches
- Club teams
- Club matches
- Attendance and performance metrics
- Report generation state
- CSV export
- JSON export

The service is local-first until Firestore club collections are fully connected. It does not invent external integrations or automatic match statistics.

## Remaining

- Club-scoped Firestore collections for players, coaches, attendance, and reports.
- PDF export from real club datasets.
- Coach-to-team assignment UI.
- Attendance and season reporting.
