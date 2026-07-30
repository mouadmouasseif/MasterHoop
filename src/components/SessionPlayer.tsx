import { Maximize2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TrainingSession } from "@/src/services/sessionService";

export default function SessionPlayer({ session }: { session: TrainingSession }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoViewport, setVideoViewport] = useState({ left: 0, top: 0, width: 100, height: 100 });
  const observedBall = session.shotAnalysis?.trajectory.points.reduce<
    (typeof session.shotAnalysis.trajectory.points)[number] | null
  >((nearest, point) => {
    if (!nearest) return point;
    return Math.abs(point.timestampMs / 1000 - currentTime) < Math.abs(nearest.timestampMs / 1000 - currentTime)
      ? point
      : nearest;
  }, null);
  const visibleBall = observedBall && Math.abs(observedBall.timestampMs / 1000 - currentTime) <= 0.25
    ? observedBall
    : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof ResizeObserver === "undefined") return undefined;
    const update = () => setVideoViewport(containedVideoViewport(video));
    const observer = new ResizeObserver(update);
    observer.observe(video);
    update();
    return () => observer.disconnect();
  }, [session.videoUrl]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const stepFrame = (direction: -1 | 1) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setPlaying(false);
    video.currentTime = Math.max(0, video.currentTime + direction / 30);
    setCurrentTime(video.currentTime);
  };

  const toggleFullscreen = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await video.requestFullscreen?.();
    } catch (error) {
      console.warn("Fullscreen unavailable:", error);
    }
  };

  const changeSpeed = (value: number) => {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          src={session.videoUrl}
          poster={session.thumbnailUrl}
          playsInline
          className="h-full w-full object-contain"
          onLoadedMetadata={(event) => setVideoViewport(containedVideoViewport(event.currentTarget))}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            setCurrentTime(video.currentTime);
            setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
          }}
          onEnded={() => setPlaying(false)}
        />
        <div className="pointer-events-none absolute inset-0">
          {visibleBall && (
            <div
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-orange/70 shadow-[0_0_20px_rgba(255,107,0,.8)]"
              style={{
                left: `${videoViewport.left + visibleBall.x * videoViewport.width}%`,
                top: `${videoViewport.top + visibleBall.y * videoViewport.height}%`,
              }}
            />
          )}
          <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 backdrop-blur">
            {visibleBall ? "Ballon réellement observé" : "Aucune superposition observée à cet instant"}
          </div>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={progress}
        onChange={(event) => {
          const video = videoRef.current;
          if (!video || !video.duration) return;
          const next = Number(event.target.value);
          video.currentTime = (next / 100) * video.duration;
          setCurrentTime(video.currentTime);
          setProgress(next);
        }}
        className="h-1 w-full accent-brand-orange"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          <button onClick={togglePlay} className="rounded-xl bg-white px-3 py-2 text-black" aria-label={playing ? "Mettre en pause" : "Lire"}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button onClick={() => stepFrame(-1)} className="rounded-xl border border-white/10 p-2 text-white/70 hover:bg-white/10" title="Image précédente">
            <SkipBack size={17} />
          </button>
          <button onClick={() => stepFrame(1)} className="rounded-xl border border-white/10 p-2 text-white/70 hover:bg-white/10" title="Image suivante">
            <SkipForward size={17} />
          </button>
          <button onClick={toggleFullscreen} className="rounded-xl border border-white/10 p-2 text-white/70 hover:bg-white/10" title="Plein écran">
            <Maximize2 size={17} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {[0.25, 0.5, 1].map((value) => (
            <button
              key={value}
              onClick={() => changeSpeed(value)}
              className={`rounded-lg px-3 py-2 text-xs font-black ${speed === value ? "bg-brand-orange text-white" : "bg-white/5 text-white/50"}`}
            >
              {value}x
            </button>
          ))}
        </div>
      </div>

      {session.shotAnalysis && (
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/40">Timeline du tir</div>
          {session.shotAnalysis.timeline.length ? (
            <div className="flex flex-wrap gap-2">
              {session.shotAnalysis.timeline.map((event) => (
                <button
                  key={event.id}
                  onClick={() => {
                    if (!videoRef.current) return;
                    videoRef.current.currentTime = event.timestampMs / 1000;
                    setCurrentTime(event.timestampMs / 1000);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65 hover:border-brand-orange/50"
                  title={event.evidence.join(" ")}
                >
                  {phaseLabel(event.phase)}
                  <span className="ml-2 text-white/35">{(event.timestampMs / 1000).toFixed(2)} s</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/40">Aucune phase n’a atteint le seuil de confiance.</p>
          )}
        </div>
      )}
    </div>
  );
}

function containedVideoViewport(video: HTMLVideoElement) {
  const containerRatio = video.clientWidth / Math.max(1, video.clientHeight);
  const mediaRatio = video.videoWidth / Math.max(1, video.videoHeight);
  if (!Number.isFinite(mediaRatio) || mediaRatio <= 0) return { left: 0, top: 0, width: 100, height: 100 };
  if (mediaRatio > containerRatio) {
    const height = (containerRatio / mediaRatio) * 100;
    return { left: 0, top: (100 - height) / 2, width: 100, height };
  }
  const width = (mediaRatio / containerRatio) * 100;
  return { left: (100 - width) / 2, top: 0, width, height: 100 };
}

function phaseLabel(phase: NonNullable<TrainingSession["shotAnalysis"]>["timeline"][number]["phase"]) {
  return ({
    preparation: "Préparation",
    dip: "Descente",
    upward_motion: "Montée",
    release: "Relâchement",
    flight: "Vol",
    result: "Résultat",
    landing: "Atterrissage",
  })[phase];
}
