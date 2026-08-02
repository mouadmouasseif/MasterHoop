# AI Coach

BasketMotion AI Coach is not a generic chatbot. Recommendations must be based on observed metrics, history, objective, position, level, available drills, confidence, and limitations.

## Current Engine

Sprint 4 adds `src/ai-coach/aiCoachEngine.ts`.

The engine is local and rule-based. It uses observed sessions, shot volume, session confidence, objective, position, weekly frequency, and equipment.

If confidence, session count, or shot volume is below threshold, the output status is `insufficient_data` and no drills are assigned.

## Current UI

Routes:

- `/app/coach-ia`
- `/ai-coach`

The UI shows objective inputs, observed evidence, current state, target, drills, generated weekly plan, confidence, and limitations.

## Limitations

- No generic chatbot.
- No medical diagnosis.
- No arbitrary potential score.
- No recommendation from missing or untrusted data.
- No external LLM dependency.
