# AI Coach

BasketMotion AI Coach is not a generic chatbot. Recommendations must be based on observed metrics, history, objective, position, level, available drills, confidence, and limitations.

## Current Engine

The current engine is local and rule-based. It can generate a release-speed recommendation when release timing and confidence are available.

If confidence is below the threshold or data is missing, no recommendation is generated.

## Limitations

- No medical diagnosis.
- No arbitrary potential score.
- No recommendation from missing or untrusted data.
- No external LLM dependency in the first Sprint 2 implementation.
