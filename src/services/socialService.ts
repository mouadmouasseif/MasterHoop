import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type {
  AIMatchRecord,
  FriendRequest,
  MatchStats,
  MatchTimelineEvent,
  MatchType,
  NotificationItem,
  PlayerStats,
  SharedVideoSession,
  SocialPlayer,
  SyncedMatchResult,
  TeamProfile,
  UserProfile,
} from "@/src/types";

const emptyStats: PlayerStats = {
  shots: 0,
  madeShots: 0,
  assists: 0,
  rebounds: 0,
  steals: 0,
  blocks: 0,
  turnovers: 0,
  minutesPlayed: 0,
};

export const createEmptyMatchStats = (): MatchStats => ({
  ...emptyStats,
  shotsAttempted: 0,
  shotsMade: 0,
  fieldGoalPercentage: 0,
  offensiveRebounds: 0,
  defensiveRebounds: 0,
});

export function createPlayerId(seed: string) {
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0) * 17, 458742);
  return `MH-${String(hash).slice(-6).padStart(6, "0")}`;
}

export function profileToSocialPlayer(
  profile: UserProfile | null,
  fallback: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null },
): SocialPlayer {
  const uniquePlayerId = profile?.uniquePlayerId || createPlayerId(fallback.uid);
  const fullName = profile?.fullName || profile?.name || fallback.displayName || "MasterHoop Player";
  const username = profile?.username || fullName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/\.$/, "") || uniquePlayerId.toLowerCase();
  const storedStats = (profile as UserProfile & { stats?: Partial<PlayerStats> } | null)?.stats || {};
  return {
    uid: profile?.uid || profile?.userId || fallback.uid,
    username,
    fullName,
    photoURL: profile?.photoURL || fallback.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
    email: profile?.email || fallback.email || "",
    uniquePlayerId,
    qrCode: profile?.qrCode || `masterhoop://player/${uniquePlayerId}`,
    followers: profile?.followers || 0,
    following: profile?.following || 0,
    teams: profile?.teams || [],
    level: "Pro Prospect",
    lastActive: "Online today",
    stats: { ...emptyStats, ...storedStats },
  };
}

export async function searchPlayers(term: string): Promise<SocialPlayer[]> {
  const clean = term.trim();
  if (!clean) return [];

  const usersRef = collection(db, "users");
  const searches = [
    query(usersRef, where("uniquePlayerId", "==", clean), limit(8)),
    query(usersRef, where("username", "==", clean.toLowerCase()), limit(8)),
    query(usersRef, where("email", "==", clean.toLowerCase()), limit(8)),
  ];

  const snapshots = await Promise.all(searches.map((item) => getDocs(item).catch(() => null)));
  const players = snapshots
    .flatMap((snapshot) => snapshot?.docs || [])
    .map((snap) => profileToSocialPlayer(snap.data() as UserProfile, { uid: snap.id }));

  return Array.from(new Map(players.map((player) => [player.uid, player])).values()).slice(0, 8);
}

export function subscribeFriends(userId: string, onChange: (friends: SocialPlayer[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "friends"), where("userId", "==", userId)), (snapshot) => {
    const friends = snapshot.docs.map((snap) => {
      const data = snap.data();
      return data.friend as SocialPlayer;
    }).filter(Boolean);
    onChange(friends);
  });
}

export function subscribeFriendRequests(userId: string, onChange: (requests: FriendRequest[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "friend_requests"), where("toUid", "==", userId), where("status", "in", ["pending", "friend_request_pending"])), (snapshot) => {
    onChange(snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }) as FriendRequest));
  });
}

export function subscribeTeams(userId: string, onChange: (teams: TeamProfile[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "teams"), where("memberUids", "array-contains", userId)), (snapshot) => {
    const teams = snapshot.docs
      .map((snap) => ({ teamId: snap.id, ...snap.data() }) as TeamProfile)
      .sort((a, b) => String(b.teamId).localeCompare(String(a.teamId)));
    onChange(teams);
  });
}

export function subscribeMatches(userId: string, onChange: (matches: AIMatchRecord[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "matches"), where("participantUids", "array-contains", userId)), (snapshot) => {
    const matches = snapshot.docs
      .map((snap) => ({ id: snap.id, ...snap.data() }) as AIMatchRecord)
      .sort((a, b) => String(b.createdAt?.seconds || b.id).localeCompare(String(a.createdAt?.seconds || a.id)));
    onChange(matches);
  });
}

export function subscribeNotifications(userId: string, onChange: (notifications: NotificationItem[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "notifications"), where("userId", "==", userId)), (snapshot) => {
    const notifications = snapshot.docs
      .map((snap) => ({ id: snap.id, ...snap.data() }) as NotificationItem)
      .sort((a, b) => Number(b.createdAt?.seconds || 0) - Number(a.createdAt?.seconds || 0));
    onChange(notifications);
  });
}

export function subscribeSharedVideos(userId: string, onChange: (videos: SharedVideoSession[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "videos"), where("participantUids", "array-contains", userId)), (snapshot) => {
    const videos = snapshot.docs
      .map((snap) => ({ id: snap.id, ...snap.data() }) as SharedVideoSession)
      .sort((a, b) => Number(b.createdAt?.seconds || 0) - Number(a.createdAt?.seconds || 0));
    onChange(videos);
  });
}

export async function sendFriendRequest(from: SocialPlayer, to: SocialPlayer) {
  const payload = {
    userId: to.uid,
    fromUid: from.uid,
    toUid: to.uid,
    fromPlayerId: from.uniquePlayerId,
    toPlayerId: to.uniquePlayerId,
    fromPlayer: from,
    status: "friend_request_pending",
    createdAt: serverTimestamp(),
  };
  await addDoc(collection(db, "friend_requests"), payload);
  await createNotification(to.uid, "Nouvelle invitation ami", `${from.fullName} veut t'ajouter sur MasterHoop.`);
}

export async function acceptFriendRequest(request: FriendRequest, me: SocialPlayer) {
  const fromPlayer = (request as FriendRequest & { fromPlayer?: SocialPlayer }).fromPlayer;
  if (!fromPlayer) return;

  await Promise.all([
    setDoc(doc(db, "friends", `${me.uid}_${fromPlayer.uid}`), {
      userId: me.uid,
      friendUid: fromPlayer.uid,
      friend: fromPlayer,
      participantUids: [me.uid, fromPlayer.uid],
      createdAt: serverTimestamp(),
    }),
    setDoc(doc(db, "friends", `${fromPlayer.uid}_${me.uid}`), {
      userId: fromPlayer.uid,
      friendUid: me.uid,
      friend: me,
      participantUids: [me.uid, fromPlayer.uid],
      createdAt: serverTimestamp(),
    }),
    updateDoc(doc(db, "friend_requests", request.id), { status: "friend_request_accepted" }),
  ]);
}

export async function createTeam(team: TeamProfile) {
  const memberUids = Array.from(new Set(team.players.map((player) => player.uid)));
  await setDoc(doc(db, "teams", team.teamId), {
    ...team,
    userId: team.captain,
    memberUids,
    participantUids: memberUids,
    pendingInvites: team.pendingInvites || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await Promise.all(team.players.map((player) => createNotification(player.uid, "Nouvelle equipe", `${team.teamName} t'a ajoute a son roster.`, { teamId: team.teamId })));
}

export async function inviteToTeam(team: TeamProfile, player: SocialPlayer) {
  await updateDoc(doc(db, "teams", team.teamId), {
    pendingInvites: arrayUnion(player.uid),
    updatedAt: serverTimestamp(),
  });
  await createNotification(player.uid, "Invitation equipe", `${team.teamName} veut t'inviter.`, { teamId: team.teamId });
}

export async function addPlayerToTeam(team: TeamProfile, player: SocialPlayer) {
  await updateDoc(doc(db, "teams", team.teamId), {
    players: arrayUnion(player),
    memberUids: arrayUnion(player.uid),
    participantUids: arrayUnion(player.uid),
    pendingInvites: arrayRemove(player.uid),
    updatedAt: serverTimestamp(),
  });
}

export async function removePlayerFromTeam(team: TeamProfile, playerUid: string) {
  await updateDoc(doc(db, "teams", team.teamId), {
    players: team.players.filter((player) => player.uid !== playerUid),
    memberUids: arrayRemove(playerUid),
    participantUids: arrayRemove(playerUid),
    updatedAt: serverTimestamp(),
  });
}

export async function createMatchInvitation(input: {
  type: MatchType;
  owner: SocialPlayer;
  opponent?: SocialPlayer;
  teamA?: SocialPlayer[];
  teamB?: SocialPlayer[];
}) {
  const teamA = input.teamA?.length ? input.teamA : [input.owner];
  const teamB = input.teamB?.length ? input.teamB : input.opponent ? [input.opponent] : [];
  const participantUids = Array.from(new Set([...teamA, ...teamB].map((player) => player.uid)));
  const payload = {
    type: input.type,
    userId: input.owner.uid,
    playerA: teamA[0]?.uid || input.owner.uid,
    playerB: teamB[0]?.uid || "",
    teamA: teamA.map((player) => player.uid),
    teamB: teamB.map((player) => player.uid),
    participantUids,
    roster: [...teamA, ...teamB],
    createdAt: serverTimestamp(),
    status: "match_invite_pending",
    score: { A: 0, B: 0 },
    stats: Object.fromEntries(participantUids.map((uid) => [uid, createEmptyMatchStats()])),
    timeline: [],
    videoUrl: "",
    reportUrl: "",
    aiAnalysis: {
      stack: ["YOLOv11", "OpenCV", "MediaPipe"],
      state: "waiting_for_acceptance",
    },
  };
  const ref = await addDoc(collection(db, "matches"), payload);
  await Promise.all(teamB.map((player) => createNotification(player.uid, "Invitation match", `${input.owner.fullName} t'invite en ${input.type}.`, { matchId: ref.id })));
  return ref.id;
}

export async function activateMatch(matchId: string) {
  await updateDoc(doc(db, "matches", matchId), {
    status: "active",
    acceptedAt: serverTimestamp(),
    "aiAnalysis.state": "camera_ready",
  });
}

export async function finishMatch(input: {
  matchId: string;
  ownerUid: string;
  videoUrl?: string;
  score: { A: number; B: number };
  stats: Record<string, MatchStats>;
  timeline: MatchTimelineEvent[];
  aiAnalysis?: Record<string, unknown>;
  participantUids: string[];
}) {
  await updateDoc(doc(db, "matches", input.matchId), {
    status: "finished",
    finishedAt: serverTimestamp(),
    videoUrl: input.videoUrl || "",
    score: input.score,
    stats: input.stats,
    timeline: input.timeline,
    aiAnalysis: input.aiAnalysis || {},
  });

  await syncVideoSession({
    ownerUid: input.ownerUid,
    participantUids: input.participantUids,
    videoUrl: input.videoUrl || "",
    matchId: input.matchId,
    reportId: input.matchId,
  });

  await Promise.all(input.participantUids.map((uid) =>
    createNotification(uid, "Rapport match disponible", "La video, les statistiques et la timeline IA sont synchronisees.", { matchId: input.matchId }),
  ));
}

export async function updateMatchAiFrame(matchId: string, input: {
  score: { A: number; B: number };
  stats: Record<string, MatchStats>;
  timeline: MatchTimelineEvent[];
}) {
  await updateDoc(doc(db, "matches", matchId), input);
}

export async function syncVideoSession(input: {
  ownerUid: string;
  participantUids: string[];
  videoUrl: string;
  analysisId?: string;
  reportId?: string;
  matchId?: string;
  match?: SyncedMatchResult;
}) {
  const payload = {
    userId: input.ownerUid,
    ownerUid: input.ownerUid,
    participantUids: Array.from(new Set([input.ownerUid, ...input.participantUids])),
    videoUrl: input.videoUrl,
    analysisId: input.analysisId || "",
    reportId: input.reportId || "",
    matchId: input.matchId || input.match?.matchId || "",
    match: input.match || null,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, "videos"), payload);
  await Promise.all(payload.participantUids.map((uid) => createNotification(uid, "Video disponible", "Une video partagee est disponible dans ton historique.")));
  return docRef.id;
}

export function buildSynced1v1Result(playerA: SocialPlayer, playerB: SocialPlayer, scoreA: number, scoreB: number, video = ""): SyncedMatchResult {
  return {
    matchId: `match-${Date.now()}`,
    playerA: playerA.uid,
    playerB: playerB.uid,
    winner: scoreA >= scoreB ? playerA.uid : playerB.uid,
    score: `${scoreA}-${scoreB}`,
    video,
    stats: {
      [playerA.uid]: playerA.stats,
      [playerB.uid]: playerB.stats,
    },
  };
}

export async function createNotification(userId: string, title: string, body: string, extra: Record<string, string> = {}) {
  await addDoc(collection(db, "notifications"), {
    userId,
    title,
    body,
    read: false,
    createdAt: serverTimestamp(),
    ...extra,
  });
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function deleteNotification(notificationId: string) {
  await deleteDoc(doc(db, "notifications", notificationId));
}

export async function markAllNotificationsRead(notifications: NotificationItem[]) {
  await Promise.all(notifications.filter((item) => !item.read).map((item) => markNotificationRead(item.id)));
}
