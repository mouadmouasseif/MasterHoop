import { Maximize2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useRef, useState } from "react";
import type { TrainingSession } from "@/src/services/sessionService";

export default function SessionPlayer({ session }: { session: TrainingSession }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);

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
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
          }}
          onEnded={() => setPlaying(false)}
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[46%] top-[18%] h-3 w-3 rounded-full bg-brand-neon shadow-[0_0_20px_rgba(0,255,148,.85)]" />
          <div className="absolute left-[48%] top-[24%] h-[24%] w-px bg-brand-neon/60" />
          <div className="absolute left-[43%] top-[32%] h-px w-[10%] bg-brand-orange/70" />
          <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 backdrop-blur">
            AI overlay: posture, joints, trajectory
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
          setProgress(next);
        }}
        className="h-1 w-full accent-brand-orange"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          <button onClick={togglePlay} className="rounded-xl bg-white px-3 py-2 text-black">
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button onClick={() => stepFrame(-1)} className="rounded-xl border border-white/10 p-2 text-white/70 hover:bg-white/10" title="Previous frame">
            <SkipBack size={17} />
          </button>
          <button onClick={() => stepFrame(1)} className="rounded-xl border border-white/10 p-2 text-white/70 hover:bg-white/10" title="Next frame">
            <SkipForward size={17} />
          </button>
          <button onClick={toggleFullscreen} className="rounded-xl border border-white/10 p-2 text-white/70 hover:bg-white/10" title="Fullscreen">
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
    </div>
  );
}
