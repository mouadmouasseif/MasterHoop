# Coach Platform

## Active

- `/coach`
- `/coach/athletes`
- `/coach/analyses`
- `/coach/compare`
- `/coach/drills`
- `/coach/missions`
- `/coach/training-plans`
- `/coach/reports`

The coach foundation includes local models for athlete profiles, timestamped video comments, video drawings, coach drills, training missions, training plans, and rule-based AI Coach recommendations.

## Comments and Drawings

Video comments support analysis ID, athlete ID, author ID, timestamp, replies, and resolved state.

Video drawings support arrow, circle, line, freehand, text, and angle markers. Coordinates are normalized so annotations can be restored after video resize.

## AI Coach

The first implementation is local and rule-based. It refuses to generate a recommendation when observed metrics or confidence are insufficient.

## Remaining

- Firestore persistence for comments and drawings.
- Real synchronized video comparison player.
- Coach report export UI.
- Full athlete detail page with real backend joins.
