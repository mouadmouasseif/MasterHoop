import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { ArrowRight, CalendarClock, Clock, Download, FileSpreadsheet, Filter, Play, Printer, Search, Share2, Target, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { analyzeBasketballSession } from "@/src/services/aiAnalysisService";
import { exportExcelWorkbook, exportProfessionalPdf, exportSessionsCsv } from "@/src/services/exportService";
import { listTrainingSessions, type TrainingSession } from "@/src/services/sessionService";
import { subscribeSharedVideos } from "@/src/services/socialService";
import type { SharedVideoSession } from "@/src/types";

export default function History({ user, refreshKey = 0 }: { user: User | null; refreshKey?: number }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [sharedVideos, setSharedVideos] = useState<SharedVideoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "shooting" | "match" | "upload">("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const next = await listTrainingSessions(user.uid);
        if (!cancelled) {
          setSessions(next);
        }
      } catch (error) {
        console.error("Session history load failed:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeSharedVideos(user.uid, setSharedVideos);
  }, [user]);

  const filteredSessions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const text = [
        session.drillName,
        session.playerName,
        session.aiFeedback,
        session.recommendations?.join(" "),
      ].join(" ").toLowerCase();
      const matchesQuery = !needle || text.includes(needle);
      const matchesFilter =
        filter === "all" ||
        (filter === "upload" && /upload|video/i.test(session.drillName)) ||
        (filter === "match" && Number(session.duration || 0) > 120) ||
        (filter === "shooting" && hasShots(session));
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, sessions]);

  const recommendations = sessions[0]?.recommendations || sessions[0]?.suggestions || [];
  const totals = useMemo(() => buildLibraryTotals(sessions), [sessions]);

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">Analyses</div>
          <h2 className="text-3xl font-black uppercase">Bibliotheque d'analyses</h2>
          <p className="mt-2 text-sm text-white/50">Toutes les analyses sauvegardees depuis la base BasketMotion AI. Ouvre une ligne pour entrer dans le dashboard detaille.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportProfessionalPdf({ sessions, recommendations })} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"><Printer size={15} /> PDF</button>
          <button onClick={() => exportExcelWorkbook({ sessions, recommendations })} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"><FileSpreadsheet size={15} /> Excel</button>
          <button onClick={() => exportSessionsCsv({ sessions, recommendations })} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"><Download size={15} /> CSV</button>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <LibraryMetric label="Analyses" value={String(sessions.length)} />
        <LibraryMetric label="Videos match" value={String(totals.matchVideos)} />
        <LibraryMetric label="Tirs observes" value={totals.shots === null ? "Non disponible" : String(totals.shots)} />
        <LibraryMetric label="Score moyen" value={totals.averageScore === null ? "Non disponible" : `${totals.averageScore}/100`} />
      </section>

      <section className="glass-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher athlete, session, recommandation..."
              className="h-11 w-full rounded-xl border border-white/10 bg-black/25 pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-orange/70"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Toutes"],
              ["shooting", "Tirs"],
              ["match", "Matchs > 2min"],
              ["upload", "Uploads"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase transition ${
                  filter === key ? "border-brand-orange bg-brand-orange/15 text-brand-orange" : "border-white/10 bg-white/[0.03] text-white/50"
                }`}
              >
                <Filter size={13} /> {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="glass-card p-10 text-center text-white/45">Loading sessions...</div>
      ) : filteredSessions.length > 0 ? (
        <AnalysisLibrary sessions={filteredSessions} onOpen={(session) => navigate(`/app/analyse/${session.id}`)} />
      ) : (
        <div className="glass-card flex flex-col items-center justify-center p-16 text-center text-white/45">
          <Video size={56} className="mb-5 text-white/20" />
          Aucune analyse trouvee. Lance une analyse live ou upload une video de match pour alimenter cette liste.
        </div>
      )}

      <div className="glass-card max-w-full overflow-hidden p-6">
        <div className="mb-4 flex items-center gap-2 text-xl font-black uppercase"><Share2 className="text-brand-orange" /> Videos synchronisees</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sharedVideos.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="font-black">{item.matchId ? `Match ${item.matchId.slice(0, 8)}` : "Video Session"}</div>
              <div className="mt-1 text-xs text-white/40">{(item.participantUids || []).length} participant(s)</div>
              <div className="mt-3 text-xs text-brand-neon">Video, analyse IA, rapport et statistiques disponibles pour chaque membre.</div>
              {item.videoUrl && (
                <video src={item.videoUrl} controls className="mt-4 aspect-video w-full rounded-xl bg-black object-cover" />
              )}
            </div>
          ))}
          {sharedVideos.length === 0 && <div className="text-sm text-white/45">Aucune video partagee pour le moment.</div>}
        </div>
      </div>
    </motion.div>
  );
}

function AnalysisLibrary({ sessions, onOpen }: { sessions: TrainingSession[]; onOpen: (session: TrainingSession) => void }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/10 px-4 py-3 md:grid-cols-[1.35fr_0.8fr_0.7fr_0.8fr_auto]">
        <div className="text-[10px] font-black uppercase tracking-widest text-white/35">Analyse</div>
        <div className="hidden text-[10px] font-black uppercase tracking-widest text-white/35 md:block">Date</div>
        <div className="hidden text-[10px] font-black uppercase tracking-widest text-white/35 md:block">Volume</div>
        <div className="hidden text-[10px] font-black uppercase tracking-widest text-white/35 md:block">Score</div>
        <div className="text-[10px] font-black uppercase tracking-widest text-white/35">Action</div>
      </div>
      <div className="divide-y divide-white/10">
        {sessions.map((session) => {
          const attempts = attemptsFor(session);
          const analysis = analyzeBasketballSession({
            madeShots: Number(session.metrics?.madeShots || 0),
            missedShots: Number(session.metrics?.missedShots || 0),
            dribbleCount: Number(session.metrics?.dribbleCount || 0),
          } as any);
          const score = Number(session.score || analysis.score || 0);

          return (
            <article key={session.id} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-4 transition hover:bg-white/[0.03] md:grid-cols-[1.35fr_0.8fr_0.7fr_0.8fr_auto] md:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-black">
                  {session.thumbnailUrl ? (
                    <img src={session.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/25"><Play size={22} /></div>
                  )}
                  <div className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-black text-white/70">
                    {formatDuration(Number(session.duration || 0))}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="truncate font-black uppercase">{session.drillName || "Analyse video"}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/45">
                    <span>{session.playerName || "Athlete non disponible"}</span>
                    <span className="inline-flex items-center gap-1"><Target size={12} /> {shotTypeLabel(session)}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-white/35">{session.aiFeedback || "Resume IA non disponible"}</p>
                </div>
              </div>

              <div className="hidden text-sm text-white/55 md:block">
                <div className="flex items-center gap-2"><CalendarClock size={14} /> {formatDate(session.createdAt)}</div>
              </div>
              <div className="hidden text-sm text-white/55 md:block">
                {attempts === null ? "Non disponible" : `${attempts} actions`}
              </div>
              <div className="hidden md:block">
                <div className="inline-flex min-w-20 items-center justify-center rounded-xl border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-sm font-black text-brand-orange">
                  {score ? score : "ND"}
                </div>
              </div>
              <button
                onClick={() => onOpen(session)}
                className="inline-flex h-11 items-center gap-2 self-center rounded-xl bg-brand-orange px-3 text-xs font-black uppercase text-white transition hover:brightness-110"
              >
                Ouvrir <ArrowRight size={15} />
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function LibraryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-white/35">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function buildLibraryTotals(sessions: TrainingSession[]) {
  const scores = sessions.map((session) => Number(session.score)).filter((value) => Number.isFinite(value) && value > 0);
  const shotCounts = sessions.map(attemptsFor).filter((value): value is number => value !== null);
  return {
    matchVideos: sessions.filter((session) => Number(session.duration || 0) > 120).length,
    shots: shotCounts.length ? shotCounts.reduce((sum, value) => sum + value, 0) : null,
    averageScore: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
  };
}

function attemptsFor(session: TrainingSession) {
  const made = Number(session.metrics?.madeShots ?? 0);
  const missed = Number(session.metrics?.missedShots ?? 0);
  const total = made + missed;
  if (total > 0) return total;
  if (session.shotAnalysis?.outcome && session.shotAnalysis.outcome !== "unknown") return 1;
  return null;
}

function hasShots(session: TrainingSession) {
  return attemptsFor(session) !== null || Boolean(session.shotAnalysis?.timeline?.length);
}

function shotTypeLabel(session: TrainingSession) {
  if (Number(session.duration || 0) > 120) return "Match";
  if (hasShots(session)) return "Tir";
  if (Number(session.metrics?.dribbleCount || 0) > 0) return "Dribble";
  return "Analyse";
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds || 0));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDate(value: unknown) {
  const date =
    value && typeof value === "object" && "toDate" in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(String(value || Date.now()));
  return date.toLocaleDateString("fr-FR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
