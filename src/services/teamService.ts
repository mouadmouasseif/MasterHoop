import { arrayRemove, arrayUnion, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { SocialPlayer, TeamProfile } from "@/src/types";
import { notifyUser } from "@/src/services/notificationService";
import { createTeam, inviteToTeam, removePlayerFromTeam, subscribeTeams } from "@/src/services/socialService";

export { createTeam, inviteToTeam, removePlayerFromTeam, subscribeTeams };

export async function acceptTeamInvite(team: TeamProfile, player: SocialPlayer) {
  if (!team.pendingInvites?.includes(player.uid)) {
    throw new Error("No pending team invite for this player.");
  }
  await updateDoc(doc(db, "teams", team.teamId), {
    players: arrayUnion(player),
    memberUids: arrayUnion(player.uid),
    participantUids: arrayUnion(player.uid),
    pendingInvites: arrayRemove(player.uid),
    status: "team_invite_accepted",
    updatedAt: serverTimestamp(),
  });
  await notifyUser(team.captain, "Invitation equipe acceptee", `${player.fullName} a rejoint ${team.teamName}.`, { teamId: team.teamId });
}

export async function declineTeamInvite(team: TeamProfile, userId: string) {
  await updateDoc(doc(db, "teams", team.teamId), {
    pendingInvites: arrayRemove(userId),
    updatedAt: serverTimestamp(),
  });
}
