import type { HighlightSegment, ShotTimelineEvent } from "@/src/ai/types";

const MIN_CONFIDENCE = 0.6;

export class HighlightExtractor {
  extract(timeline: ShotTimelineEvent[]): HighlightSegment[] {
    const observed = timeline
      .filter((event) => event.status === "observed" && event.confidence >= MIN_CONFIDENCE)
      .sort((left, right) => left.timestampMs - right.timestampMs);
    if (!observed.length) return [];

    const groups: ShotTimelineEvent[][] = [];
    for (const event of observed) {
      const current = groups.at(-1);
      if (!current || event.timestampMs - current.at(-1)!.timestampMs > 2_000) groups.push([event]);
      else current.push(event);
    }

    return groups.map((events, index) => ({
      id: `highlight-${index + 1}-${events[0].frameIndex}`,
      startMs: Math.max(0, events[0].timestampMs - 800),
      endMs: events.at(-1)!.timestampMs + 1_200,
      confidence: Math.min(...events.map((event) => event.confidence)),
      phases: [...new Set(events.map((event) => event.phase))],
      source: "observed_timeline",
      evidenceEventIds: events.map((event) => event.id),
    }));
  }
}
