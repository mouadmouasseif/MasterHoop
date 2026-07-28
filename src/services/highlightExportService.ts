import type { MatchSummary } from "@/src/types/match";

export type HighlightExportBundle = {
  summary: MatchSummary;
  videoUrl?: string;
};

export function buildHighlightExport(bundle: HighlightExportBundle) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    matchId: bundle.summary.matchId,
    videoUrl: bundle.videoUrl || "",
    textSummary: bundle.summary.textSummary,
    score: bundle.summary.score,
    playerStats: bundle.summary.playerStats,
    highlights: bundle.summary.highlights,
    timeline: bundle.summary.timeline.events,
    futureFormats: ["pdf", "xlsx"],
  };
}

export function downloadHighlightJson(bundle: HighlightExportBundle) {
  const payload = buildHighlightExport(bundle);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `master-hoop-highlights-${bundle.summary.matchId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
