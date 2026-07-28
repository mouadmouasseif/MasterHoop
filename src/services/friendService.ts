import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { FriendRequest, SocialPlayer } from "@/src/types";
import { notifyUser } from "@/src/services/notificationService";
import { searchPlayers, sendFriendRequest, subscribeFriendRequests, subscribeFriends } from "@/src/services/socialService";

export { searchPlayers, sendFriendRequest, subscribeFriendRequests, subscribeFriends };

export async function acceptFriendRequestSecure(request: FriendRequest, me: SocialPlayer) {
  if (request.toUid !== me.uid) {
    throw new Error("Only the invited user can accept this friend request.");
  }
  const fromPlayer = (request as FriendRequest & { fromPlayer?: SocialPlayer }).fromPlayer;
  if (!fromPlayer) {
    throw new Error("Friend request is missing source player data.");
  }

  await Promise.all([
    setDoc(doc(db, "friends", `${me.uid}_${fromPlayer.uid}`), {
      userId: me.uid,
      friendUid: fromPlayer.uid,
      friend: fromPlayer,
      participantUids: [me.uid, fromPlayer.uid],
      status: "friend_request_accepted",
      createdAt: serverTimestamp(),
    }),
    setDoc(doc(db, "friends", `${fromPlayer.uid}_${me.uid}`), {
      userId: fromPlayer.uid,
      friendUid: me.uid,
      friend: me,
      participantUids: [me.uid, fromPlayer.uid],
      status: "friend_request_accepted",
      createdAt: serverTimestamp(),
    }),
    updateDoc(doc(db, "friend_requests", request.id), { status: "friend_request_accepted", acceptedAt: serverTimestamp() }),
    notifyUser(fromPlayer.uid, "Invitation acceptee", `${me.fullName} a accepte ton invitation ami.`),
  ]);
}

export async function rejectFriendRequest(request: FriendRequest, userId: string) {
  if (request.toUid !== userId) {
    throw new Error("Only the invited user can reject this friend request.");
  }
  await updateDoc(doc(db, "friend_requests", request.id), {
    status: "friend_request_rejected",
    rejectedAt: serverTimestamp(),
  });
}

export async function removeFriend(userId: string, friendUid: string) {
  await Promise.all([
    deleteDoc(doc(db, "friends", `${userId}_${friendUid}`)),
    deleteDoc(doc(db, "friends", `${friendUid}_${userId}`)),
  ]);
}
