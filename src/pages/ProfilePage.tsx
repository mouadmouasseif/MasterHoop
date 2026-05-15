import { Download, Edit3, UserRound } from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { Session, UserProfile } from '@/src/types';
import { downloadJson, getLocalAnalyses } from '@/src/services/localAnalysisService';

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
  const exportData = { user: user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null, profile, sessions, analyses };

  return (
    <div className="space-y-8">
      <div className="glass-card overflow-hidden p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-brand-orange/30 bg-brand-orange/15">
              {user?.photoURL ? <img src={user.photoURL} alt="avatar" className="h-full w-full object-cover" /> : <UserRound className="text-brand-orange" size={38} />}
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-brand-orange">Profil joueur</div>
              <h2 className="text-3xl font-black">{profile?.name || user?.displayName || 'Joueur Master Hoop'}</h2>
              <p className="text-sm text-white/45">{user?.email || 'Compte local'} - {profile?.basketballPosition || 'Poste non defini'}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={onEditProfile} className="flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white">
              <Edit3 size={17} /> Modifier profil
            </button>
            <button onClick={() => downloadJson('master-hoop-profile-data.json', exportData)} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold">
              <Download size={17} /> Telecharger data
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Info label="Age" value={profile?.age ? `${profile.age}` : '-'} />
        <Info label="Taille" value={profile?.height ? `${profile.height} cm` : '-'} />
        <Info label="Poids" value={profile?.weight ? `${profile.weight} kg` : '-'} />
        <Info label="Rapports IA" value={`${analyses.length}`} />
      </div>

      <div className="rounded-3xl border border-white/10 bg-brand-surface/70 p-6">
        <h3 className="mb-4 text-xl font-black">Raccourci analyses</h3>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-[10px] font-black uppercase tracking-widest text-white/35">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}
