import { motion } from 'motion/react';
import { Settings } from 'lucide-react';
import { useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile } from '@/src/types';
import basketMotionAiLogo from '@/src/assets/basketmotion-logo.png';

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
  onSave: (formData: Partial<UserProfile>) => void | Promise<void>;
}) {
  const defaultPosition = profile?.basketballPosition || '1 - PG (Meneur)';
  const [selectedPosition, setSelectedPosition] = useState(defaultPosition);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4">
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
        className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-brand-surface p-6 shadow-2xl sm:p-8"
      >
        <div className="pointer-events-none absolute right-0 top-0 p-8 opacity-5">
          <Settings size={120} />
        </div>
        <div className="relative z-10">
          <div className="mb-6 flex items-center gap-4">
            <img src={basketMotionAiLogo} alt="Basket Motion logo" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10" />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-wide">Bienvenue sur Basket Motion</h2>
              <p className="text-sm text-white/40">Complete ton profil pour calibrer l'analyse IA.</p>
            </div>
          </div>

          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (isSaving) return;

              setError(null);
              setIsSaving(true);

              const formData = new FormData(event.currentTarget);
              const nextProfile = {
                name: formData.get('name') as string,
                age: Number(formData.get('age')),
                height: Number(formData.get('height')),
                weight: Number(formData.get('weight')),
                basketballPosition: selectedPosition,
              };

              try {
                localStorage.setItem('userProfile', JSON.stringify(nextProfile));
                await onSave(nextProfile);
              } catch (err) {
                console.error('PROFILE SAVE ERROR', err);
                setError("Impossible d'enregistrer le profil. Verifie Firebase puis reessaie.");
              } finally {
                setIsSaving(false);
              }
            }}
            className="space-y-5"
          >
            <ProfileInput label="Nom complet" name="name" defaultValue={profile?.name || user?.displayName || ''} placeholder="Mouad Mouasseif" />
            <div className="grid grid-cols-3 gap-4">
              <ProfileInput label="Age" name="age" type="number" defaultValue={profile?.age || ''} />
              <ProfileInput label="Taille cm" name="height" type="number" defaultValue={profile?.height || ''} />
              <ProfileInput label="Poids kg" name="weight" type="number" defaultValue={profile?.weight || ''} />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-white/40">Poste de jeu</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                {positions.map((position) => {
                  const value = `${position.id} - ${position.abbr} (${position.name})`;
                  const active = selectedPosition === value;
                  return (
                    <label
                      key={position.id}
                      className={`cursor-pointer rounded-xl border p-3 text-center transition ${
                        active
                          ? 'border-brand-orange bg-brand-orange/15 text-white shadow-lg shadow-brand-orange/15'
                          : 'border-white/10 bg-white/5 hover:border-brand-orange/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="basketballPosition"
                        value={value}
                        checked={active}
                        onChange={() => setSelectedPosition(value)}
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
            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
                {error}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              {profile && (
                <button type="button" onClick={onClose} className="flex-1 rounded-2xl bg-white/5 py-4 font-bold transition hover:bg-white/10">
                  Annuler
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="flex-[2] rounded-2xl bg-brand-orange py-4 font-black uppercase tracking-wider text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60 neon-orange-shadow"
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
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
