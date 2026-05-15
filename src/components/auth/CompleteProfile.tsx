import { motion } from 'motion/react';
import { Settings } from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile } from '@/src/types';
import masterHoopLogo from '@/src/assets/master-hoop-logo.png';

const positions = [
  { id: 1, abbr: 'PG', name: 'Meneur' },
  { id: 2, abbr: 'SG', name: 'Arriere' },
  { id: 3, abbr: 'SF', name: 'Ailier' },
  { id: 4, abbr: 'PF', name: 'Ailier fort' },
  { id: 5, abbr: 'C', name: 'Pivot' },
];

export default function CompleteProfile({
  profile,
  user,
  onClose,
  onSave,
}: {
  profile: UserProfile | null;
  user: FirebaseUser | null;
  onClose: () => void;
  onSave: (formData: Partial<UserProfile>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => profile && onClose()}
      />
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-brand-surface p-8 shadow-2xl"
      >
        <div className="absolute right-0 top-0 p-8 opacity-5">
          <Settings size={120} />
        </div>
        <div className="relative z-10">
          <div className="mb-6 flex items-center gap-4">
            <img src={masterHoopLogo} alt="Master Hoop logo" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10" />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-wide">Bienvenue sur Master Hoop</h2>
              <p className="text-sm text-white/40">Complete ton profil pour calibrer l'analyse IA.</p>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const nextProfile = {
                name: formData.get('name') as string,
                age: Number(formData.get('age')),
                height: Number(formData.get('height')),
                weight: Number(formData.get('weight')),
                basketballPosition: formData.get('basketballPosition') as string,
              };
              localStorage.setItem('userProfile', JSON.stringify(nextProfile));
              onSave(nextProfile);
            }}
            className="space-y-5"
          >
            <ProfileInput label="Nom complet" name="name" defaultValue={profile?.name || user?.displayName || ''} placeholder="Mouad Mouasseif" />
            <div className="grid grid-cols-3 gap-4">
              <ProfileInput label="Age" name="age" type="number" defaultValue={profile?.age || 20} />
              <ProfileInput label="Taille cm" name="height" type="number" defaultValue={profile?.height || 185} />
              <ProfileInput label="Poids kg" name="weight" type="number" defaultValue={profile?.weight || 80} />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-white/40">Poste de jeu</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                {positions.map((position) => {
                  const value = `${position.id} - ${position.abbr} (${position.name})`;
                  return (
                    <label key={position.id} className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 text-center transition hover:border-brand-orange/50">
                      <input
                        type="radio"
                        name="basketballPosition"
                        value={value}
                        defaultChecked={(profile?.basketballPosition || '1 - PG (Meneur)') === value}
                        className="sr-only"
                      />
                      <div className="text-lg font-black text-brand-orange">{position.id}</div>
                      <div className="text-xs font-bold">{position.abbr}</div>
                      <div className="text-[10px] text-white/40">{position.name}</div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-orange/20 bg-brand-orange/10 p-4 text-sm text-white/60">
              Si le compte existe deja, tu vas directement vers Live. Sinon cette fenetre configure ton profil joueur.
            </div>
            <div className="flex gap-3 pt-2">
              {profile && (
                <button type="button" onClick={onClose} className="flex-1 rounded-2xl bg-white/5 py-4 font-bold transition hover:bg-white/10">
                  Annuler
                </button>
              )}
              <button type="submit" className="flex-[2] rounded-2xl bg-brand-orange py-4 font-black uppercase tracking-wider text-white transition hover:brightness-110 neon-orange-shadow">
                Save Profile
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function ProfileInput({
  label,
  name,
  defaultValue,
  type = 'text',
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: any;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none transition focus:border-brand-orange/50"
        required
      />
    </div>
  );
}
