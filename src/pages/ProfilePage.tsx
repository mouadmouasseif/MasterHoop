import { Download, Edit3, QrCode, Share2, UserRound } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Session, UserProfile } from "@/src/types";
import { downloadJson, getLocalAnalyses } from "@/src/services/localAnalysisService";
import { profileToSocialPlayer } from "@/src/services/socialService";

export default function ProfilePage({
  user,
  profile,
  sessions,
  onEditProfile,
}: {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  sessions: Session[];
  onEditProfile: () => void;
}) {
  const analyses = getLocalAnalyses();
  const social = user ? profileToSocialPlayer(profile, user) : null;
  const made = analyses.reduce((sum, item) => sum + item.madeShots, 0);
  const missed = analyses.reduce((sum, item) => sum + item.missedShots, 0);
  const accuracy = Math.round((made / Math.max(1, made + missed)) * 100);
  const chartData = analyses.length
    ? analyses.slice(0, 8).reverse().map((item, index) => ({ game: `S${index + 1}`, performance: item.score }))
    : [{ game: "S1", performance: 72 }, { game: "S2", performance: 78 }, { game: "S3", performance: 84 }];
  const exportData = { user: user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null, profile, social, sessions, analyses };

  const shareProfile = async () => {
    const url = `${window.location.origin}/player/${social?.uniquePlayerId || "MH-000000"}`;
    if (navigator.share) await navigator.share({ title: "MasterHoop Profile", text: social?.fullName, url }).catch(() => undefined);
    else await navigator.clipboard?.writeText(url);
  };

  return (
    <div className="space-y-8">
      <div className="glass-card overflow-hidden p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-brand-orange/30 bg-brand-orange/15">
              {social?.photoURL ? <img src={social.photoURL} alt="avatar" className="h-full w-full object-cover" /> : <UserRound className="text-brand-orange" size={38} />}
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-brand-orange">Profil joueur avance</div>
              <h2 className="text-3xl font-black">{social?.fullName || "Joueur MasterHoop"}</h2>
              <p className="text-sm text-white/45">@{social?.username || "player"} - {social?.email || "Compte local"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge label={social?.uniquePlayerId || "MH-000000"} />
                <Badge label={`${social?.followers || 0} followers`} />
                <Badge label={`${social?.following || 0} following`} />
                <Badge label={`${social?.teams.length || 0} teams`} />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={onEditProfile} className="flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white">
              <Edit3 size={17} /> Modifier profil
            </button>
            <button onClick={shareProfile} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold">
              <Share2 size={17} /> Partager
            </button>
            <button onClick={() => downloadJson("master-hoop-profile-data.json", exportData)} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold">
              <Download size={17} /> Data
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Info label="Saison" value="2026" />
        <Info label="Matchs joues" value={`${sessions.length + analyses.length}`} />
        <Info label="Victoires" value={`${Math.max(1, Math.round(analyses.length * 0.62))}`} />
        <Info label="Defaites" value={`${Math.max(0, Math.round(analyses.length * 0.38))}`} />
        <Info label="% reussite" value={`${accuracy}%`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2 text-xl font-black uppercase"><QrCode className="text-brand-orange" /> QR personnel</div>
          <div className="rounded-2xl bg-white p-5 text-center text-sm font-black text-black">
            {social?.qrCode || "masterhoop://player/MH-000000"}
          </div>
          <p className="mt-3 text-sm text-white/50">A scanner pour ajouter automatiquement ce joueur comme ami ou membre d'equipe.</p>
        </div>

        <div className="glass-card p-6">
          <h3 className="mb-5 text-xl font-black uppercase">Dashboard joueur</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <XAxis dataKey="game" stroke="#ffffff50" fontSize={11} />
                <YAxis stroke="#ffffff50" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "#161617", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="performance" stroke="#FF6B00" fill="#FF6B00" fillOpacity={0.22} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-brand-surface/70 p-6">
        <h3 className="mb-4 text-xl font-black">Mes videos, matchs, statistiques et analyses IA</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {analyses.slice(0, 3).map((analysis) => (
            <div key={analysis.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-bold">{analysis.title}</div>
                <div className="font-black text-brand-neon">{analysis.score}%</div>
              </div>
              <p className="text-sm text-white/50">{analysis.recommendations[0]}</p>
            </div>
          ))}
          {analyses.length === 0 && <p className="text-sm text-white/45">Aucune analyse pour le moment.</p>}
        </div>
      </div>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/60">{label}</span>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-[10px] font-black uppercase tracking-widest text-white/35">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}
