import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Bell, Check, History, Send, Shield, Swords, Timer, Trophy, Users, Video } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import StatCard from "@/src/components/ui/StatCard";
import AIMatchRecorder from "@/src/components/matches/AIMatchRecorder";
import type { AIMatchRecord, GameMode, NotificationItem, SocialPlayer, TeamProfile, UserProfile } from "@/src/types";
import {
  activateMatch,
  createMatchInvitation,
  profileToSocialPlayer,
  subscribeFriends,
  subscribeMatches,
  subscribeNotifications,
  subscribeTeams,
} from "@/src/services/socialService";

const modeConfig: Record<GameMode, { title: string; players: number; tactical: string }> = {
  "1v1": { title: "1 vs 1", players: 2, tactical: "Duel, creation d'espace, contestation tir" },
  "3v3": { title: "3 vs 3", players: 6, tactical: "Spacing, rotations courtes, score equipe" },
  "5v5": { title: "5 vs 5", players: 10, tactical: "Compositions, analyse tactique, roles complets" },
};

export default function GameModesPage({ user, profile }: { user: FirebaseUser | null; profile: UserProfile | null }) {
  const me = useMemo(() => user ? profileToSocialPlayer(profile, user) : null, [profile, user]);
  const [mode, setMode] = useState<GameMode>("1v1");
  const [seconds, setSeconds] = useState(600);
  const [friends, setFriends] = useState<SocialPlayer[]>([]);
  const [teams, setTeams] = useState<TeamProfile[]>([]);
  const [matches, setMatches] = useState<AIMatchRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [selectedTeamA, setSelectedTeamA] = useState("");
  const [selectedTeamB, setSelectedTeamB] = useState("");
  const [activeMatchId, setActiveMatchId] = useState("");
  const [status, setStatus] = useState("Chargement Firestore temps reel...");

  useEffect(() => {
    if (!user) return undefined;
    const unsubs = [
      subscribeFriends(user.uid, setFriends),
      subscribeTeams(user.uid, setTeams),
      subscribeMatches(user.uid, setMatches),
      subscribeNotifications(user.uid, setNotifications),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [user]);

  useEffect(() => {
    setSelectedFriendId((current) => current || friends[0]?.uid || "");
  }, [friends]);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeMatch = matches.find((match) => match.id === activeMatchId) || matches.find((match) => match.status === "active");
  const waitingMatches = matches.filter((match) => match.status === "waiting");
  const recentMatches = matches.slice(0, 8);
  const selectedFriend = friends.find((friend) => friend.uid === selectedFriendId);

  const create1v1 = async () => {
    if (!me || !selectedFriend) {
      setStatus("Ajoute d'abord un ami Firestore pour creer un 1vs1.");
      return;
    }
    const matchId = await createMatchInvitation({ type: "1vs1", owner: me, opponent: selectedFriend });
    setActiveMatchId(matchId);
    setStatus(`Invitation 1vs1 creee pour ${selectedFriend.fullName}. Match en attente.`);
  };

  const createTeamMatch = async () => {
    if (!me) return;
    const teamA = teams.find((team) => team.teamId === selectedTeamA) || teams[0];
    const teamB = teams.find((team) => team.teamId === selectedTeamB) || teams.find((team) => team.teamId !== teamA?.teamId);
    if (!teamA) {
      setStatus(`Cree une equipe ${mode} avant de lancer ce mode.`);
      return;
    }
    const matchId = await createMatchInvitation({
      type: mode === "3v3" ? "3vs3" : "5vs5",
      owner: me,
      teamA: teamA.players,
      teamB: teamB?.players || [],
    });
    await activateMatch(matchId);
    setActiveMatchId(matchId);
    setStatus(`${mode} cree et active depuis les rosters Firestore.`);
  };

  const acceptWaitingMatch = async (match: AIMatchRecord) => {
    await activateMatch(match.id);
    setActiveMatchId(match.id);
    setStatus(`Match ${match.type} accepte. Camera IA prete.`);
  };

  return (
    <motion.div key="games" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange">
            <Swords size={15} /> Game Modes Firestore
          </div>
          <h2 className="text-3xl font-black uppercase">Matchs, equipes et camera IA.</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/50">1vs1, 3vs3 et 5vs5 chargent automatiquement amis, equipes, notifications et matchs recents depuis Firebase.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {(Object.keys(modeConfig) as GameMode[]).map((item) => (
          <button
            key={item}
            onClick={() => setMode(item)}
            className={`rounded-2xl border p-5 text-left transition ${mode === item ? "border-brand-orange bg-brand-orange/15" : "border-white/10 bg-brand-surface/70 hover:bg-white/5"}`}
          >
            <div className="mb-2 text-2xl font-black">{modeConfig[item].title}</div>
            <div className="text-sm text-white/50">{modeConfig[item].players} joueurs - {modeConfig[item].tactical}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Users />} value={`${friends.length}`} label="Amis live" color="text-brand-neon" />
        <StatCard icon={<Shield />} value={`${teams.length}`} label="Equipes" color="text-brand-orange" />
        <StatCard icon={<Bell />} value={`${notifications.filter((item) => !item.read).length}`} label="Notifications" />
        <StatCard icon={<Timer />} value={formatClock(seconds)} label="Chronometre" />
      </div>

      <div className="glass-card p-6">
        <div className="mb-4 flex items-center gap-2 text-xl font-black uppercase"><Trophy className="text-brand-orange" /> Creation automatique</div>
        {mode === "1v1" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <select value={selectedFriendId} onChange={(event) => setSelectedFriendId(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
              {friends.map((friend) => <option key={friend.uid} value={friend.uid}>{friend.fullName} - {friend.uniquePlayerId}</option>)}
              {friends.length === 0 && <option value="">Aucun ami Firestore</option>}
            </select>
            <button onClick={create1v1} className="flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black"><Send size={17} /> Creer invitation</button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <TeamSelect value={selectedTeamA} onChange={setSelectedTeamA} teams={teams.filter((team) => team.mode === mode)} label="Team A" />
            <TeamSelect value={selectedTeamB} onChange={setSelectedTeamB} teams={teams.filter((team) => team.mode === mode)} label="Team B" />
            <button onClick={createTeamMatch} className="flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black"><Video size={17} /> Start Match</button>
          </div>
        )}
        <p className="mt-3 text-sm text-white/55">{status}</p>
      </div>

      {waitingMatches.length > 0 && (
        <div className="glass-card p-6">
          <div className="mb-4 text-xl font-black uppercase">Invitations match</div>
          <div className="grid gap-3 md:grid-cols-2">
            {waitingMatches.map((match) => (
              <div key={match.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <div className="font-black">{match.type}</div>
                  <div className="text-xs text-white/40">{match.participantUids.length} participant(s)</div>
                </div>
                <button onClick={() => acceptWaitingMatch(match)} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-black"><Check size={14} /> Accepter</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeMatch && <AIMatchRecorder match={activeMatch} ownerUid={user?.uid || activeMatch.userId} />}

      <div className="glass-card p-6">
        <div className="mb-4 flex items-center gap-2 text-xl font-black uppercase"><History className="text-brand-orange" /> Matchs recents Firestore</div>
        <div className="grid gap-3 md:grid-cols-3">
          {recentMatches.map((match) => (
            <button key={match.id} onClick={() => setActiveMatchId(match.id)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left hover:bg-white/5">
              <div className="text-sm font-black">{match.type} - {match.status}</div>
              <div className="mt-2 text-3xl font-black text-brand-neon">{match.score?.A || 0} - {match.score?.B || 0}</div>
              <div className="mt-2 text-xs text-white/40">{match.participantUids.length} participant(s)</div>
            </button>
          ))}
          {recentMatches.length === 0 && <div className="text-sm text-white/45">Aucun match Firestore sauvegarde.</div>}
        </div>
      </div>
    </motion.div>
  );
}

function TeamSelect({ value, onChange, teams, label }: { value: string; onChange: (value: string) => void; teams: TeamProfile[]; label: string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
      <option value="">{label}</option>
      {teams.map((team) => <option key={team.teamId} value={team.teamId}>{team.teamName} - {team.players.length} joueurs</option>)}
    </select>
  );
}

function formatClock(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
