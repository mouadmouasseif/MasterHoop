import { CalendarClock, Clock, Play } from "lucide-react";
import type { TrainingSession } from "@/src/services/sessionService";

export default function SessionHistory({
  sessions,
  selectedId,
  onSelect,
}: {
  sessions: TrainingSession[];
  selectedId?: string;
  onSelect: (session: TrainingSession) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelect(session)}
          className={`overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 ${
            selectedId === session.id ? "border-brand-orange bg-brand-orange/10" : "border-white/10 bg-brand-surface/65"
          }`}
        >
          <div className="relative aspect-video bg-black">
            {session.thumbnailUrl ? (
              <img src={session.thumbnailUrl} alt={session.drillName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-white/25"><Play size={40} /></div>
            )}
            <div className="absolute right-3 top-3 rounded-xl bg-black/70 px-3 py-1 text-lg font-black text-brand-neon">
              {session.score}
            </div>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-black uppercase">{session.drillName}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                  <CalendarClock size={13} /> {formatDate(session.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-white/45">
                <Clock size={13} /> {formatDuration(session.duration)}
              </div>
            </div>
            <p className="line-clamp-2 text-sm text-white/50">{session.aiFeedback}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDate(value: unknown) {
  const date =
    value && typeof value === "object" && "toDate" in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(String(value || Date.now()));
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
