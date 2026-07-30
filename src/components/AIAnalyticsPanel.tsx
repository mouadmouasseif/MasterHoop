import { Brain, CheckCircle2, Clock3, MapPinned, Target, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import type { AIAnalysisResult } from "@/src/services/aiAnalysisService";

export default function AIAnalyticsPanel({ analysis }: { analysis: AIAnalysisResult }) {
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-brand-surface/70 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-orange">
            <Brain size={16} /> AI Analytics
          </div>
          <p className="mt-2 text-sm text-white/55">{analysis.aiFeedback}</p>
        </div>
        <div className="rounded-2xl bg-brand-neon/15 px-4 py-3 text-3xl font-black text-brand-neon">
          {analysis.score}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="text-[10px] font-bold uppercase text-white/35">Confiance globale</div>
          <div className="mt-1 text-xl font-black">{analysis.confidenceScore}%</div>
        </div>
        {analysis.videoQuality && (
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="text-[10px] font-bold uppercase text-white/35">Qualité vidéo</div>
            <div className="mt-1 text-xl font-black">{analysis.videoQuality.score}%</div>
            <div className="mt-1 text-xs text-white/45">
              Pose visible sur {analysis.videoQuality.poseFrames}/{analysis.videoQuality.sampledFrames} images
            </div>
            <div className="mt-1 text-xs text-white/45">
              Prétraitement {analysis.videoQuality.preprocessing.engine.toUpperCase()}
              {analysis.videoQuality.preprocessing.engine === "opencv"
                ? ` · ${analysis.videoQuality.preprocessing.stabilizedFrames} images stabilisées`
                : ""}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {(Object.entries(analysis.metricResults) as [keyof typeof analysis.metricResults, (typeof analysis.metricResults)[keyof typeof analysis.metricResults]][]).map(([key, result]) => (
          <div key={key} className="rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="text-[10px] font-bold uppercase text-white/35">{key.replace(/([A-Z])/g, " $1")}</div>
            <div className="mt-1 text-xl font-black">{result.value ?? "—"}</div>
            <div className="text-[10px] text-white/35">
              Confiance {Math.round(result.confidence * 100)}% · {result.status}
            </div>
          </div>
        ))}
      </div>

      {analysis.videoQuality && analysis.videoQuality.recommendations.length > 0 && (
        <List
          title="Qualité vidéo"
          icon={<Target size={16} />}
          items={analysis.videoQuality.recommendations}
          color={analysis.videoQuality.analysisPossible ? "text-brand-neon" : "text-amber-300"}
        />
      )}

      {analysis.shotAnalysis && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-orange">
              <Clock3 size={16} /> Timeline observée
            </div>
            <div className="text-[10px] font-bold uppercase text-white/40">
              Résultat {analysis.shotAnalysis.outcome === "unknown" ? "non observable" : analysis.shotAnalysis.outcome}
              {` · confiance ${Math.round(analysis.shotAnalysis.confidence.global * 100)} %`}
            </div>
          </div>
          {analysis.shotAnalysis.timeline.length ? (
            <div className="flex flex-wrap gap-2">
              {analysis.shotAnalysis.timeline.map((event) => (
                <div key={event.id} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                  <div className="text-xs font-black text-white/80">{phaseLabel(event.phase)}</div>
                  <div className="mt-1 text-[10px] text-white/40">
                    {(event.timestampMs / 1000).toFixed(2)} s · {Math.round(event.confidence * 100)} %
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs leading-5 text-white/45">
              Aucune phase de tir n’a atteint le seuil de confiance de 60 %. Une nouvelle capture mieux cadrée est recommandée.
            </p>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <TemporalMetric label="Angle de relâchement 2D" result={analysis.shotAnalysis.trajectory.releaseAngle} />
            <TemporalMetric label="Équilibre 2D" result={analysis.shotAnalysis.biomechanics.balance} />
            <TemporalMetric label="Temps préparation-relâchement" result={analysis.shotAnalysis.biomechanics.timing} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {analysis.shotAnalysis.shotDistance
              ? <TemporalMetric label="Distance au panier" result={analysis.shotAnalysis.shotDistance} />
              : <UnavailableMetric label="Distance au panier" />}
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-white/35">
                <MapPinned size={13} /> Calibration terrain
              </div>
              <div className="mt-1 text-sm font-black text-white/75">
                {analysis.shotAnalysis.courtCalibration?.status === "calibrated"
                  ? `Validée · ${Math.round(analysis.shotAnalysis.courtCalibration.confidence * 100)} %`
                  : "Non calibré"}
              </div>
              <div className="mt-1 text-[10px] text-white/35">
                Les mètres restent masqués sans quatre repères fiables.
              </div>
            </div>
          </div>
          {(analysis.shotAnalysis.highlights?.length || 0) > 0 && (
            <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
              {analysis.shotAnalysis.highlights.length} moment{analysis.shotAnalysis.highlights.length > 1 ? "s" : ""} fort{analysis.shotAnalysis.highlights.length > 1 ? "s" : ""} fondé{analysis.shotAnalysis.highlights.length > 1 ? "s" : ""} sur la timeline observée
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <List title="Strengths" icon={<CheckCircle2 size={16} />} items={analysis.strengths} color="text-brand-neon" />
        <List title="Weaknesses" icon={<Target size={16} />} items={analysis.weaknesses} color="text-red-300" />
        <List title="Suggestions" icon={<TrendingUp size={16} />} items={analysis.suggestions} color="text-brand-orange" />
      </div>
    </div>
  );
}

function TemporalMetric({ label, result }: { label: string; result: import("@/src/ai/types").MetricResult }) {
  const value = result.value === null
    ? "Indisponible"
    : `${result.value}${result.unit === "ms" ? " ms" : result.unit === "deg_2d" ? "°" : result.unit === "m" ? " m" : ""}`;
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] font-bold uppercase text-white/35">{label}</div>
      <div className="mt-1 text-sm font-black text-white/75">{value}</div>
      <div className="mt-1 text-[10px] text-white/35">Confiance {Math.round(result.confidence * 100)} %</div>
    </div>
  );
}

function UnavailableMetric({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] font-bold uppercase text-white/35">{label}</div>
      <div className="mt-1 text-sm font-black text-white/75">Indisponible</div>
      <div className="mt-1 text-[10px] text-white/35">Ancienne analyse non calibrée</div>
    </div>
  );
}

function phaseLabel(phase: import("@/src/ai/types").ShotPhase) {
  return ({
    preparation: "Préparation",
    dip: "Descente",
    upward_motion: "Montée",
    release: "Relâchement",
    flight: "Vol",
    result: "Résultat",
    landing: "Atterrissage",
  } satisfies Record<import("@/src/ai/types").ShotPhase, string>)[phase];
}

function List({ title, icon, items, color }: { title: string; icon: ReactNode; items: string[]; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className={`mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest ${color}`}>
        {icon} {title}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="text-sm leading-5 text-white/60">{item}</div>
        ))}
      </div>
    </div>
  );
}
