import { motion } from "motion/react";
import {
  Brain,
  ChevronRight,
  ClipboardList,
  Lightbulb,
  Video,
} from "lucide-react";
import VideoUploadAnalyzer from "@/src/components/analysis/VideoUploadAnalyzer";
import { getLocalAnalyses } from "@/src/services/localAnalysisService";

export default function CoachPage(props: any) {
  const { loadingTips, coachTips, fetchTips } = props;

  const safeCoachTips: string[] = coachTips ?? [];

  const analyses = getLocalAnalyses() ?? [];
  const last = analyses.length > 0 ? analyses[0] : null;

  return (
    <motion.div
      key="coach"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">

        {/* LEFT PANEL */}
        <div className="glass-card relative overflow-hidden p-8">
          <Brain className="absolute right-8 top-8 text-white/5" size={180} />

          <div className="relative z-10">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-orange/20">
                <Brain className="h-8 w-8 text-brand-orange" />
              </div>

              <div>
                <h2 className="text-4xl font-black uppercase">
                  Coach AI
                </h2>
                <p className="text-white/40">
                  Conseils, recommandations et rapports videos sauvegardes.
                </p>
              </div>
            </div>

            {/* LOADING */}
            {loadingTips ? (
              <div className="space-y-4 py-8">
                <div className="h-12 animate-pulse rounded-xl bg-white/5" />
                <div className="h-12 w-3/4 animate-pulse rounded-xl bg-white/5" />
                <div className="h-12 w-1/2 animate-pulse rounded-xl bg-white/5" />
              </div>
            ) : (
              <div className="grid gap-4">

                {(safeCoachTips.length > 0
                  ? safeCoachTips
                  : [
                      "Garde ton coude sous la balle pendant le release.",
                      "Charge davantage les jambes avant le tir pour gagner en puissance.",
                      "Apres crossover, ajoute un premier pas plus explosif vers le cercle.",
                    ]
                ).map((tip: string, index: number) => (
                  <div
                    key={`${tip}-${index}`}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-neon/20 font-black text-brand-neon">
                      {index + 1}
                    </div>
                    <p className="text-white/75">{tip}</p>
                  </div>
                ))}

                <button
                  onClick={fetchTips}
                  className="mt-4 flex items-center gap-2 text-sm font-bold text-brand-neon transition hover:gap-3"
                >
                  Recalculer les conseils <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-6">
          <VideoUploadAnalyzer />

          <div className="rounded-3xl border border-brand-orange/20 bg-brand-orange/10 p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-brand-orange">
              <Lightbulb size={17} /> Recommandation rapide
            </div>

            <p className="text-sm text-white/70">
              {last?.recommendations?.[0] ??
                "Upload une video ou lance un drill pour recevoir une recommandation personnalisee."}
            </p>
          </div>
        </div>
      </div>

      {/* ANALYSES */}
      <div className="grid gap-4 lg:grid-cols-3">
        {analyses.slice(0, 6).map((analysis) => (
          <div
            key={analysis.id}
            className="rounded-2xl border border-white/10 bg-brand-surface/70 p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <ClipboardList className="text-brand-orange" size={20} />
              <span className="text-2xl font-black text-brand-neon">
                {analysis.score}%
              </span>
            </div>

            <h3 className="font-black">{analysis.title}</h3>

            <p className="mb-4 text-xs text-white/40">
              {new Date(analysis.createdAt).toLocaleString()}
            </p>

            <div className="space-y-2 text-sm text-white/60">
              <p>
                <span className="font-black text-brand-neon">
                  Good:
                </span>{" "}
                {analysis.strengths?.[0] ?? "N/A"}
              </p>

              <p>
                <span className="font-black text-red-300">
                  Fix:
                </span>{" "}
                {analysis.weaknesses?.[0] ?? "N/A"}
              </p>

              <p>
                <span className="font-black text-brand-orange">
                  Next:
                </span>{" "}
                {analysis.recommendations?.[0] ?? "N/A"}
              </p>
            </div>

            {analysis.videoUrl && (
              <video
                src={analysis.videoUrl}
                controls
                className="mt-4 aspect-video w-full rounded-xl bg-black object-cover"
              />
            )}
          </div>
        ))}

        {analyses.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-white/45">
            <Video className="mb-4 text-white/20" size={40} />
            Aucun rapport encore. Les videos enregistrees ou uploadees apparaitront ici avec notes, conseils et recommandations.
          </div>
        )}
      </div>
    </motion.div>
  );
}