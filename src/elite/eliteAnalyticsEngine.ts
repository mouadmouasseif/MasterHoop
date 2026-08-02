import type { ShotAnalysisComparison } from "@/src/ai/types";
import type { LocalAnalysis } from "@/src/services/localAnalysisService";
import type {
  EliteAnalyticsReport,
  EliteAnalyticsStatus,
  EliteAthleteSummary,
  EliteMetric,
  FatigueTrendReport,
  MotionSimilarityReport,
  ScoutingReport,
  TeamAnalyticsReport,
} from "@/src/elite/types";

const MIN_ANALYSES = 2;
const MIN_SHOTS = 12;
const MIN_CONFIDENCE = 60;

export function buildEliteAnalyticsReport(athlete: EliteAthleteSummary, team: EliteAthleteSummary[] = [athlete]): EliteAnalyticsReport {
  const analyses = sortAnalyses(athlete.analyses);
  const scouting = buildScoutingReport(athlete.name, analyses);
  const motionSimilarity = buildMotionSimilarityReport(analyses);
  const fatigue = buildFatigueTrendReport(analyses);
  const teamReport = buildTeamAnalyticsReport(team);
  const sections = [scouting.status, motionSimilarity.status, fatigue.status, teamReport.status];
  const status = sections.every((section) => section === "ready")
    ? "ready"
    : sections.some((section) => section !== "insufficient_data")
      ? "partial"
      : "insufficient_data";

  return {
    status,
    generatedAt: new Date().toISOString(),
    motionSimilarity,
    scouting,
    fatigue,
    team: teamReport,
    limitations: [
      "Elite analytics are based on observed local session data only.",
      "No professional player comparison is generated without a licensed or coach validated reference.",
      "Movement stability is not a medical diagnosis or injury prediction.",
    ],
  };
}

export function buildMotionSimilarityReport(analyses: LocalAnalysis[]): MotionSimilarityReport {
  const measured = sortAnalyses(analyses).filter((analysis) => analysis.shotAnalysis);
  if (measured.length < 2) {
    return insufficientMotion("At least two measured shot analyses are required for motion similarity.");
  }

  const baseline = measured[0].shotAnalysis!;
  const current = measured[measured.length - 1].shotAnalysis!;
  const metrics = [
    eliteMetricFromDelta("Release angle", current.trajectory.releaseAngle.value, current.trajectory.releaseAngle.unit || "deg", current.trajectory.releaseAngle.confidence, "Current observed release angle."),
    eliteMetricFromDelta("Balance", current.biomechanics.balance.value, current.biomechanics.balance.unit || "ratio", current.biomechanics.balance.confidence, "Current observed balance signal."),
    eliteMetricFromDelta("Timing", current.biomechanics.timing.value, current.biomechanics.timing.unit || "ms", current.biomechanics.timing.confidence, "Current observed preparation to release timing."),
    eliteMetricFromDelta("Stability", current.biomechanics.stability.value, current.biomechanics.stability.unit || "ratio", current.biomechanics.stability.confidence, "Current observed landing stability."),
  ];
  const usable = metrics.filter((metric) => metric.value !== null && metric.confidence >= 0.55);
  if (usable.length < 2) {
    return insufficientMotion("Not enough comparable pose metrics reached the confidence threshold.");
  }

  const score = calculateSimilarityScore({
    status: "partial",
    confidence: average(usable.map((metric) => metric.confidence)),
    metrics: [],
    limitations: [],
  }, baseline.confidence.global, current.confidence.global);
  return {
    status: usable.length === metrics.length ? "ready" : "partial",
    score,
    confidence: average(usable.map((metric) => metric.confidence)),
    comparisonTarget: "personal_best",
    metrics,
    limitations: [
      "Similarity is measured against the athlete's own observed baseline, not a professional player.",
      "2D pose metrics depend on camera angle and visible joints.",
    ],
  };
}

export function buildScoutingReport(athleteName: string, analyses: LocalAnalysis[]): ScoutingReport {
  const shots = totalShots(analyses);
  const confidence = averageConfidence(analyses);
  if (analyses.length < MIN_ANALYSES || shots < MIN_SHOTS || confidence < MIN_CONFIDENCE) {
    return {
      status: "insufficient_data",
      athleteName,
      confidence,
      dataVolume: { analyses: analyses.length, shots },
      strengths: [],
      weaknesses: [],
      priorities: ["Record more validated shooting sessions before generating scouting conclusions."],
      limitations: ["Scouting report blocked by data volume or confidence threshold."],
    };
  }

  const strengths = unique(analyses.flatMap((analysis) => analysis.strengths)).slice(0, 5);
  const weaknesses = unique(analyses.flatMap((analysis) => analysis.weaknesses)).slice(0, 5);
  const recommendations = unique(analyses.flatMap((analysis) => analysis.recommendations)).slice(0, 5);

  return {
    status: "ready",
    athleteName,
    confidence,
    dataVolume: { analyses: analyses.length, shots },
    strengths: strengths.length ? strengths : ["Consistent participation across observed sessions."],
    weaknesses,
    priorities: recommendations.length ? recommendations : ["Keep collecting measured sessions for a sharper scouting profile."],
    limitations: ["No arbitrary potential score is generated."],
  };
}

export function buildFatigueTrendReport(analyses: LocalAnalysis[]): FatigueTrendReport {
  const sorted = sortAnalyses(analyses);
  if (sorted.length < MIN_ANALYSES) {
    return {
      status: "insufficient_data",
      confidence: 0,
      startAccuracy: null,
      endAccuracy: null,
      delta: null,
      label: "unknown",
      limitations: ["At least two sessions are required to compare fatigue trend."],
    };
  }
  const split = Math.max(1, Math.floor(sorted.length / 2));
  const start = accuracy(sorted.slice(0, split));
  const end = accuracy(sorted.slice(split));
  if (start === null || end === null) {
    return {
      status: "insufficient_data",
      confidence: averageConfidence(sorted),
      startAccuracy: start,
      endAccuracy: end,
      delta: null,
      label: "unknown",
      limitations: ["Shot makes and misses are required for fatigue trend."],
    };
  }
  const delta = Number((end - start).toFixed(1));
  return {
    status: averageConfidence(sorted) >= MIN_CONFIDENCE ? "ready" : "partial",
    confidence: averageConfidence(sorted),
    startAccuracy: Number(start.toFixed(1)),
    endAccuracy: Number(end.toFixed(1)),
    delta,
    label: delta < -5 ? "declining" : delta > 5 ? "improving" : "stable",
    limitations: ["This is a performance trend, not a medical fatigue diagnosis."],
  };
}

export function buildTeamAnalyticsReport(athletes: EliteAthleteSummary[]): TeamAnalyticsReport {
  const active = athletes.filter((athlete) => athlete.analyses.length > 0);
  if (!active.length) {
    return {
      status: "insufficient_data",
      confidence: 0,
      athleteCount: 0,
      averageScore: null,
      averageAccuracy: null,
      leaders: [],
      attention: [],
      limitations: ["Team analytics require at least one athlete with observed analyses."],
    };
  }
  const allAnalyses = active.flatMap((athlete) => athlete.analyses);
  const averageScore = average(allAnalyses.map((analysis) => analysis.score));
  const averageAccuracy = accuracy(allAnalyses);
  const leaders = [...active]
    .sort((a, b) => average(b.analyses.map((analysis) => analysis.score)) - average(a.analyses.map((analysis) => analysis.score)))
    .slice(0, 3)
    .map((athlete) => athlete.name);
  const attention = active
    .filter((athlete) => average(athlete.analyses.map((analysis) => analysis.score)) < 72)
    .map((athlete) => athlete.name);

  return {
    status: allAnalyses.length >= MIN_ANALYSES ? "ready" : "partial",
    confidence: averageConfidence(allAnalyses),
    athleteCount: active.length,
    averageScore: Number(averageScore.toFixed(1)),
    averageAccuracy: averageAccuracy === null ? null : Number(averageAccuracy.toFixed(1)),
    leaders,
    attention,
    limitations: ["Team analytics are descriptive and require coach validation before publication."],
  };
}

function calculateSimilarityScore(comparison: ShotAnalysisComparison, baselineConfidence: number, currentConfidence: number) {
  const confidencePenalty = 1 - Math.min(comparison.confidence, baselineConfidence, currentConfidence);
  const score = 88 - confidencePenalty * 22;
  return Math.max(0, Math.min(100, Number(score.toFixed(1))));
}

function eliteMetricFromDelta(label: string, value: number | null, unit: string, confidence: number, evidence: string): EliteMetric {
  const status: EliteAnalyticsStatus = value === null || confidence < 0.55 ? "insufficient_data" : confidence >= 0.75 ? "ready" : "partial";
  return { label, value, unit, confidence, status, evidence: [evidence] };
}

function insufficientMotion(reason: string): MotionSimilarityReport {
  return {
    status: "insufficient_data",
    score: null,
    confidence: 0,
    comparisonTarget: "personal_best",
    metrics: [],
    limitations: [reason],
  };
}

function sortAnalyses(analyses: LocalAnalysis[]) {
  return [...analyses].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function totalShots(analyses: LocalAnalysis[]) {
  return analyses.reduce((sum, analysis) => sum + analysis.madeShots + analysis.missedShots, 0);
}

function averageConfidence(analyses: LocalAnalysis[]) {
  if (!analyses.length) return 0;
  return Number(average(analyses.map((analysis) => analysis.confidenceScore ?? analysis.qualityScore ?? analysis.score)).toFixed(1));
}

function accuracy(analyses: LocalAnalysis[]) {
  const made = analyses.reduce((sum, analysis) => sum + analysis.madeShots, 0);
  const shots = totalShots(analyses);
  if (!shots) return null;
  return (made / shots) * 100;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
