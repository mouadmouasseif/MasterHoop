import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Crown, Shield, Target, Trophy, Users } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { profileToSocialPlayer } from "@/src/services/socialService";
import type { SocialPlayer, UserProfile } from "@/src/types";

const categories = [
  { key: "shooters", title: "Top Shooters", icon: <Target size={18} />, color: "text-brand-neon" },
  { key: "defenders", title: "Top Defenders", icon: <Shield size={18} />, color: "text-blue-300" },
  { key: "passers", title: "Top Passers", icon: <Users size={18} />, color: "text-brand-orange" },
  { key: "mvp", title: "MVP Ranking", icon: <Crown size={18} />, color: "text-yellow-300" },
];

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<SocialPlayer[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "users"), limit(50)), (snapshot) => {
      setPlayers(snapshot.docs.map((snap) => profileToSocialPlayer(snap.data() as UserProfile, { uid: snap.id })));
    });
    return () => unsub();
  }, []);

  const chart = players.map((player) => ({
    name: player.username.split(".")[0],
    performance: shootingPercentage(player),
    assists: player.stats.assists,
    defense: player.stats.steals + player.stats.blocks,
  }));

  return (
    <motion.div key="leaderboard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-7">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange"><Trophy size={15} /> Leaderboard</div>
        <h2 className="text-3xl font-black uppercase">Classement global</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/50">Top shooters, defenders, passers et MVP ranking, pret pour la collection leaderboards.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => (
          <div key={category.key} className="glass-card p-5">
            <div className={`mb-4 flex items-center gap-2 text-sm font-black uppercase ${category.color}`}>{category.icon} {category.title}</div>
            <div className="space-y-3">
              {rankPlayers(players, category.key).map((player, index) => (
                <div key={player.uid} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-black text-white/35">#{index + 1}</div>
                    <img src={player.photoURL} alt={player.fullName} className="h-9 w-9 rounded-lg" />
                    <div>
                      <div className="text-sm font-bold">{player.fullName}</div>
                      <div className="text-[10px] text-white/35">{player.uniquePlayerId}</div>
                    </div>
                  </div>
                  <div className="text-sm font-black text-brand-neon">{scorePlayer(player, category.key)}</div>
                </div>
              ))}
              {players.length === 0 && <div className="text-sm text-white/40">Aucun joueur Firestore indexe.</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h3 className="mb-5 text-xl font-black uppercase">Progression joueurs</h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <XAxis dataKey="name" stroke="#ffffff50" fontSize={11} />
              <YAxis stroke="#ffffff50" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: "#161617", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
              <Bar dataKey="performance" fill="#00FF94" radius={[8, 8, 0, 0]} />
              <Bar dataKey="defense" fill="#2F80FF" radius={[8, 8, 0, 0]} />
              <Bar dataKey="assists" fill="#FF6B00" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

function rankPlayers(players: SocialPlayer[], key: string) {
  return [...players].sort((a, b) => scorePlayer(b, key) - scorePlayer(a, key)).slice(0, 3);
}

function scorePlayer(player: SocialPlayer, key: string) {
  if (key === "shooters") return shootingPercentage(player);
  if (key === "defenders") return player.stats.steals + player.stats.blocks;
  if (key === "passers") return player.stats.assists;
  return player.stats.madeShots + player.stats.assists + player.stats.rebounds + player.stats.steals * 2 + player.stats.blocks * 2;
}

function shootingPercentage(player: SocialPlayer) {
  return Math.round((player.stats.madeShots / Math.max(1, player.stats.shots)) * 100);
}
