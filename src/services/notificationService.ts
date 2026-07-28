import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { NotificationItem } from "@/src/types";

export function createNotificationPayload<TExtra extends Record<string, string> = Record<string, never>>(
  userId: string,
  title: string,
  body: string,
  extra = {} as TExtra,
) {
  return {
    userId,
    title,
    body,
    read: false,
    createdAt: serverTimestamp(),
    ...extra,
  };
}

export async function notifyUser(userId: string, title: string, body: string, extra: Record<string, string> = {}) {
  return addDoc(collection(db, "notifications"), createNotificationPayload(userId, title, body, extra));
}

export async function markNotificationAsRead(notificationId: string) {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function removeNotification(notificationId: string) {
  await deleteDoc(doc(db, "notifications", notificationId));
}

export async function markAllNotificationsAsRead(notifications: NotificationItem[], userId: string) {
  await Promise.all(
    notifications
      .filter((item) => item.userId === userId && !item.read)
      .map((item) => markNotificationAsRead(item.id)),
  );
}
