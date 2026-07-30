import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Palette, Plus, Shield, Trash2, UserPlus, Users } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import type { SocialPlayer, TeamProfile, UserProfile } from "@/src/types";
import QrScanner from "@/src/components/qr/QrScanner";
import {
  createTeam,
  inviteToTeam,
  profileToSocialPlayer,
  removePlayerFromTeam,
  searchPlayers,
  subscribeFriends,
  subscribeTeams,
} from "@/src/services/socialService";

export default function TeamsPage({ user, profile }: { user: FirebaseUser | null; profile: UserProfile | null }) {
  const me = useMemo(() => user ? profileToSocialPlayer(profile, user) : null, [profile, user]);
  const [teamName, setTeamName] = useState("Team Alpha");
  const [mode, setMode] = useState<"3v3" | "5v5">("3v3");
  const [color, setColor] = useState("#FF6B00");
  const [roster, setRoster] = useState<SocialPlayer[]>([]);
  const [friends, setFriends] = useState<SocialPlayer[]>([]);
  const [teams, setTeams] = useState<TeamProfile[]>([]);
  const [inviteQuery, setInviteQuery] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!user) return undefined;
    const unsubFriends = subscribeFriends(user.uid, setFriends);
    const unsubTeams = subscribeTeams(user.uid, setTeams);
    return () => {
      unsubFriends();
      unsubTeams();
    };
  }, [user]);

  const maxPlayers = mode === "3v3" ? 3 : 5;
  const rosterWithMe = useMemo(() => (me ? [me, ...roster].slice(0, maxPlayers) : roster.slice(0, maxPlayers)), [maxPlayers, me, roster]);

  const saveTeam = async () => {
    if (!me) return;
    const team: TeamProfile = {
      teamId: `team-${Date.now()}`,
      teamName,
      logo: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(teamName)}`,
      color,
      captain: me.uid,
      players: rosterWithMe,
      memberUids: rosterWithMe.map((player) => player.uid),
      pendingInvites: [],
      mode,
    };
    await createTeam(team);
    setStatus(`${team.teamName} creee dans Firestore avec ${team.players.length}/${maxPlayers} joueur(s).`);
  };

  const addPlayer = useCallback(async (value = inviteQuery) => {
    const clean = value.replace("BasketMotion-Ai://player/", "").trim();
    if (!clean) return;

    const friend = friends.find((player) =>
      [player.uid, player.username, player.email, player.uniquePlayerId].some((item) => item?.toLowerCase() === clean.toLowerCase()),
    );
    const player = friend || (await searchPlayers(clean))[0];

    if (!player) {
      setStatus("Joueur introuvable dans Firestore. Essaie un username, email ou Player ID.");
      return;
    }
    if (rosterWithMe.some((item) => item.uid === player.uid)) {
      setStatus(`${player.fullName} est deja dans la composition.`);
      return;
    }
    if (rosterWithMe.length >= maxPlayers) {
      setStatus(`Composition ${mode} complete.`);
      return;
    }

    setRoster((current) => [...current, player]);
    if (teams[0]) await inviteToTeam(teams[0], player);
    setStatus(`${player.fullName} ajoute depuis ${friend ? "Friends List" : "Firestore Search"}.`);
  }, [friends, inviteQuery, maxPlayers, mode, rosterWithMe, teams]);

  return (
    <motion.div key="teams" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-7">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange"><Shield size={15} /> My Teams</div>
        <h2 className="text-3xl font-black uppercase">Equipes Firestore 3vs3 et 5vs5</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/50">Compositions synchronisees en temps reel depuis Firebase: amis, recherche utilisateur, Player ID et QR Code.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-card p-6">
          <div className="space-y-4">
            <label className="block text-xs font-black uppercase tracking-widest text-white/40">Nom equipe</label>
            <input value={teamName} onChange={(event) => setTeamName(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 outline-none" />
            <div className="grid grid-cols-2 gap-3">
              {(["3v3", "5v5"] as const).map((item) => (
                <button key={item} onClick={() => setMode(item)} className={`rounded-xl border px-4 py-3 font-black ${mode === item ? "border-brand-orange bg-brand-orange/15 text-brand-orange" : "border-white/10 bg-white/5"}`}>
                  {item}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Palette size={18} className="text-brand-orange" />
              <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-12 w-16 rounded-xl border border-white/10 bg-transparent" />
              <span className="text-sm text-white/50">Couleur equipe</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 text-xs font-black uppercase tracking-widest text-white/40">Friends List</div>
              <div className="grid gap-2">
                {friends.slice(0, 5).map((friend) => (
                  <button key={friend.uid} onClick={() => addPlayer(friend.uniquePlayerId)} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-left text-xs hover:bg-white/10">
                    <span>{friend.fullName}</span>
                    <span className="text-white/35">{friend.uniquePlayerId}</span>
                  </button>
                ))}
                {friends.length === 0 && <div className="text-xs text-white/35">Aucun ami Firestore pour le moment.</div>}
              </div>
            </div>

            <div className="flex gap-2">
              <input value={inviteQuery} onChange={(event) => setInviteQuery(event.target.value)} placeholder="Username, email, Player ID" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none" />
              <button onClick={() => addPlayer()} className="rounded-xl border border-white/10 px-4 text-white/70" title="Ajouter joueur"><UserPlus size={18} /></button>
              <QrScanner onScan={(value) => addPlayer(value)} />
            </div>
            <button onClick={saveTeam} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black uppercase">
              <Plus size={17} /> Creer equipe
            </button>
            {status && <div className="rounded-xl bg-white/5 px-3 py-2 text-xs text-brand-neon">{status}</div>}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="glass-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-black uppercase"><Users className="text-brand-orange" /> Roster {rosterWithMe.length}/{maxPlayers}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {rosterWithMe.map((player) => <PlayerChip key={player.uid} player={player} locked={player.uid === me?.uid} onRemove={() => setRoster((current) => current.filter((item) => item.uid !== player.uid))} />)}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {teams.map((team) => (
              <TeamCard key={team.teamId} team={team} me={me} onRemove={(playerUid) => removePlayerFromTeam(team, playerUid)} />
            ))}
            {teams.length === 0 && <div className="rounded-2xl border border-white/10 p-6 text-sm text-white/45">Aucune equipe Firestore synchronisee.</div>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PlayerChip({ player, locked, onRemove }: { key?: string; player: SocialPlayer; locked?: boolean; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex min-w-0 items-center gap-3">
        <img src={player.photoURL} alt={player.fullName} className="h-10 w-10 rounded-lg" />
        <div className="min-w-0">
          <div className="truncate font-bold">{player.fullName}</div>
          <div className="text-xs text-white/40">{player.uniquePlayerId}</div>
        </div>
      </div>
      {!locked && <button onClick={onRemove} className="rounded-lg border border-white/10 p-2 text-red-200"><Trash2 size={14} /></button>}
    </div>
  );
}

function TeamCard({ team, me, onRemove }: { key?: string; team: TeamProfile; me: SocialPlayer | null; onRemove: (playerUid: string) => void | Promise<void> }) {
  const isCaptain = Boolean(me && team.captain === me.uid);
  return (
    <div className="rounded-2xl border border-white/10 bg-brand-surface/70 p-5">
      <div className="mb-4 flex items-center gap-3">
        <img src={team.logo} alt={team.teamName} className="h-12 w-12 rounded-xl" />
        <div>
          <div className="font-black">{team.teamName}</div>
          <div className="text-xs text-white/45">{team.mode} - {team.players.length} joueurs</div>
        </div>
      </div>
      <div className="mb-3 h-2 rounded-full" style={{ backgroundColor: team.color }} />
      <div className="space-y-2">
        {team.players.map((player) => (
          <div key={player.uid} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-xs">
            <span>{player.fullName}</span>
            {isCaptain && player.uid !== me?.uid && <button onClick={() => onRemove(player.uid)} className="text-red-200">Retirer</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
