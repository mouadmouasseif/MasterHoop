import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CircleStop, Download, Play, Radio, Target } from "lucide-react";
import type { AIMatchRecord, MatchStats, MatchTimelineEvent } from "@/src/types";
import { finishMatch, updateMatchAiFrame } from "@/src/services/socialService";
import { uploadSharedMatchFile } from "@/src/services/firebaseStorage";
import { buildMatchSummary } from "@/src/services/matchScoreService";
import { downloadHighlightJson } from "@/src/services/highlightExportService";
import type { MatchEvent } from "@/src/types/match";

type Score = { A: number; B: number };

export default function AIMatchRecorder({ match, ownerUid }: { match: AIMatchRecord; ownerUid: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [score, setScore] = useState<Score>(match.score || { A: 0, B: 0 });
  const [timeline, setTimeline] = useState<MatchTimelineEvent[]>(match.timeline || []);
  const [stats, setStats] = useState<Record<string, MatchStats>>(match.stats || {});
  const [status, setStatus] = useState("Caméra prête. L’analyse automatique de match n’est pas activée.");
  const startedAtRef = useRef<number>(0);

  const players = useMemo(() => {
    const ids = [...(match.teamA || []), ...(match.teamB || [])];
    return ids.length ? ids : match.participantUids;
  }, [match.participantUids, match.teamA, match.teamB]);

  const matchSummary = useMemo(
    () => buildMatchSummary(match.id, timeline.map(toMatchEvent).reverse()),
    [match.id, timeline],
  );

  useEffect(() => {
    if (!recording) return;
    const timer = window.setTimeout(() => {
      updateMatchAiFrame(match.id, { score, stats, timeline }).catch((error) => console.warn("Live match sync failed:", error));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [match.id, recording, score, stats, timeline]);

  async function start() {
    const userStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
    setStream(userStream);
    if (videoRef.current) {
      videoRef.current.srcObject = userStream;
      await videoRef.current.play().catch(() => undefined);
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(userStream, { mimeType: pickMimeType() });
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setRecording(true);
    setStatus("Capture vidéo active. Aucun événement de match n’est généré automatiquement.");
  }

  async function stop() {
    const recorder = recorderRef.current;
    if (!recorder) return;

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" }));
      recorder.stop();
    });

    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setRecording(false);
    setStatus("Upload Storage et synchronisation participants...");

    const videoUrl = blob.size ? await uploadSharedMatchFile(ownerUid, match.id, blob, "videos", match.participantUids) : "";
    await finishMatch({
      matchId: match.id,
      ownerUid,
      videoUrl,
      score,
      stats,
      timeline,
      participantUids: match.participantUids,
      aiAnalysis: { status: "unavailable", reason: "Le moteur d’événements de match n’est pas implémenté dans les Sprints 1 et 2." },
    });
    setStatus("Match terminé : vidéo enregistrée. Seules les annotations existantes ont été conservées.");
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase text-brand-orange"><Radio size={17} /> Caméra de match</div>
          <div className="mt-1 text-xs text-white/45">{status}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadHighlightJson({ summary: matchSummary, videoUrl: match.videoUrl })} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase text-white/70">
            <Download size={15} /> Export
          </button>
          <button disabled={recording} onClick={start} className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black uppercase text-black disabled:opacity-40">
            <Play size={15} /> Start Match
          </button>
          <button disabled={!recording} onClick={stop} className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-xs font-black uppercase text-white disabled:opacity-40">
            <CircleStop size={15} /> Finish
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
        <div className="relative aspect-video bg-black">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          {!stream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
              <Camera size={42} />
              <div className="mt-3 text-xs font-black uppercase tracking-widest">Camera inactive</div>
            </div>
          )}
          <div className="absolute left-4 top-4 rounded-xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur">
            <div className="text-[10px] font-black uppercase text-white/45">Score validé</div>
            <div className="text-2xl font-black text-brand-neon">Team A {score.A} - {score.B} Team B</div>
          </div>
          <div className="absolute bottom-4 left-4 flex gap-2">
            <AiBadge label="Capture vidéo" active={recording} />
            <AiBadge label="Analyse événements indisponible" active={false} />
          </div>
        </div>

        <div className="max-h-[520px] overflow-y-auto border-l border-white/10 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase text-brand-orange"><Target size={16} /> Timeline intelligente</div>
          <div className="space-y-2">
            {timeline.map((event) => (
              <button key={event.id} className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-brand-neon">{formatTime(event.timestamp)}</span>
                  <span className="text-[10px] uppercase text-white/35">Team {event.team}</span>
                </div>
                <div className="mt-1 text-sm font-bold">{event.type}</div>
                <div className="text-[10px] text-white/35">{event.playerId}</div>
              </button>
            ))}
            {timeline.length === 0 && <div className="text-sm text-white/40">Aucun événement validé. L’annotation automatique sera ajoutée dans un sprint futur après validation du modèle.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AiBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${active ? "border-brand-neon/40 bg-brand-neon/15 text-brand-neon" : "border-white/10 bg-black/40 text-white/35"}`}>
      {label}
    </div>
  );
}

function toMatchEvent(event: MatchTimelineEvent): MatchEvent {
  return {
    id: event.id,
    timestamp: event.timestamp,
    team: event.team,
    playerId: event.playerId,
    points: event.points,
    type: event.type === "2 Points" || event.type === "3 Points"
      ? "made_shot"
      : event.type === "Assist"
      ? "pass"
      : event.type === "Rebound"
      ? "rebound"
      : event.type === "Steal"
      ? "steal"
      : "score_change",
  };
}

function pickMimeType() {
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) return "video/webm;codecs=vp9,opus";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) return "video/webm;codecs=vp8,opus";
  return "video/webm";
}

function formatTime(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
