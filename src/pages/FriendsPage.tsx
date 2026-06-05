import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Ban, Check, QrCode, Search, Send, Trash2, UserPlus, Users } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import type { FriendRequest, SocialPlayer, UserProfile } from "@/src/types";
import QrScanner from "@/src/components/qr/QrScanner";
import {
  acceptFriendRequest,
  profileToSocialPlayer,
  searchPlayers,
  sendFriendRequest,
  subscribeFriendRequests,
  subscribeFriends,
} from "@/src/services/socialService";

export default function FriendsPage({ user, profile }: { user: FirebaseUser | null; profile: UserProfile | null }) {
  const me = useMemo(() => user ? profileToSocialPlayer(profile, user) : null, [profile, user]);
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<SocialPlayer[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [results, setResults] = useState<SocialPlayer[]>([]);
  const [status, setStatus] = useState("");
  const [qrValue, setQrValue] = useState("");

  useEffect(() => {
    if (!user) return undefined;
    const unsubFriends = subscribeFriends(user.uid, setFriends);
    const unsubRequests = subscribeFriendRequests(user.uid, setRequests);
    return () => {
      unsubFriends();
      unsubRequests();
    };
  }, [user]);

  const runSearch = useCallback(async (value = query) => {
    const next = await searchPlayers(value);
    setResults(next.filter((player) => player.uid !== user?.uid));
    setStatus(next.length ? `${next.length} joueur(s) trouve(s) dans Firestore` : "Aucun joueur trouve");
  }, [query, user?.uid]);

  const addFriend = async (player: SocialPlayer) => {
    if (!me) return;
    await sendFriendRequest(me, player);
    setStatus(`Invitation envoyee a ${player.fullName}`);
  };

  const addByQr = async (value = qrValue) => {
    const id = value.replace("masterhoop://player/", "").trim();
    setQuery(id);
    const [match] = await searchPlayers(id);
    if (match) await addFriend(match);
    else setStatus("QR Code non reconnu. Essaie avec un Player ID comme MH-458742.");
  };

  return (
    <motion.div key="friends" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-7">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange"><Users size={15} /> Social</div>
        <h2 className="text-3xl font-black uppercase">Friends Firestore</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/50">Recherche, invitations et acceptation en temps reel via users, friends et friend_requests.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <div className="glass-card p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
              <Search size={18} className="text-brand-orange" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Username, email, MH-458742..." className="w-full bg-transparent text-sm outline-none placeholder:text-white/30" />
            </div>
            <button onClick={() => runSearch()} className="rounded-xl bg-brand-orange px-5 py-3 text-sm font-black uppercase">Search</button>
          </div>
          {status && <div className="mb-4 rounded-xl bg-white/5 px-3 py-2 text-xs text-brand-neon">{status}</div>}

          {requests.length > 0 && (
            <div className="mb-5 rounded-2xl border border-brand-orange/20 bg-brand-orange/10 p-4">
              <div className="mb-3 text-sm font-black uppercase text-brand-orange">Demandes en attente</div>
              <div className="grid gap-2">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between rounded-xl bg-black/20 p-3 text-sm">
                    <span>{request.fromPlayerId}</span>
                    <button onClick={() => me && acceptFriendRequest(request, me)} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-black">
                      <Check size={14} /> Accepter
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {(results.length ? results : friends).map((player) => (
              <PlayerRow key={player.uid} player={player} actionLabel={results.length ? "Ajouter" : "Inviter 1vs1"} onAction={() => results.length ? addFriend(player) : setStatus(`Selectionne ${player.fullName} depuis Game Modes pour creer un vrai match Firestore.`)} />
            ))}
            {!results.length && !friends.length && <div className="rounded-2xl border border-white/10 p-6 text-sm text-white/45">Aucun ami Firestore pour le moment.</div>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="glass-card p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase text-brand-orange"><QrCode size={18} /> QR Code</div>
            <div className="rounded-2xl border border-white/10 bg-white p-4 text-center text-xs font-black text-black">
              {me?.qrCode || "masterhoop://player/MH-000000"}
            </div>
            <input value={qrValue} onChange={(event) => setQrValue(event.target.value)} placeholder="Coller QR / Player ID scanne" className="mt-4 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none" />
            <div className="mt-3 flex gap-2">
              <button onClick={() => addByQr()} className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-black">
                <UserPlus size={17} /> Ajouter
              </button>
              <QrScanner onScan={(value) => addByQr(value)} />
            </div>
          </div>

          <div className="rounded-2xl border border-brand-orange/20 bg-brand-orange/10 p-5">
            <div className="text-sm font-black uppercase text-brand-orange">Notifications temps reel</div>
            <p className="mt-2 text-sm text-white/60">Les invitations ami/equipe, videos disponibles et rapports IA sont ecrits dans la collection notifications.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PlayerRow({ player, actionLabel, onAction }: { key?: string; player: SocialPlayer; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <img src={player.photoURL} alt={player.fullName} className="h-12 w-12 rounded-xl object-cover" />
        <div>
          <div className="font-black">{player.fullName}</div>
          <div className="text-xs text-white/45">@{player.username} - {player.uniquePlayerId} - {player.level}</div>
          <div className="text-xs text-white/30">{player.lastActive}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={onAction} className="flex items-center gap-2 rounded-xl bg-brand-orange px-3 py-2 text-xs font-black"><Send size={14} /> {actionLabel}</button>
        <button className="rounded-xl border border-white/10 p-2 text-white/60" title="Voir profil"><Search size={15} /></button>
        <button className="rounded-xl border border-white/10 p-2 text-white/60" title="Supprimer"><Trash2 size={15} /></button>
        <button className="rounded-xl border border-white/10 p-2 text-red-300" title="Bloquer"><Ban size={15} /></button>
      </div>
    </div>
  );
}
