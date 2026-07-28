import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Bell, CheckCheck, Trash2, Video } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import type { NotificationItem } from "@/src/types";
import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from "@/src/services/socialService";

export default function NotificationsPage({ user, onOpenHistory, onOpenGames }: {
  user: FirebaseUser | null;
  onOpenHistory: () => void;
  onOpenGames: () => void;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeNotifications(user.uid, setNotifications);
  }, [user]);

  const openNotification = async (notification: NotificationItem) => {
    await markNotificationRead(notification.id).catch(() => undefined);
    if (notification.matchId || notification.title.toLowerCase().includes("match")) onOpenGames();
    else if (notification.title.toLowerCase().includes("video") || notification.title.toLowerCase().includes("rapport")) onOpenHistory();
  };

  return (
    <motion.div key="notifications" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-brand-orange"><Bell size={15} /> Realtime</div>
          <h2 className="text-3xl font-black uppercase">Notifications</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/50">Invitations amis, equipes, matchs, videos disponibles et rapports IA en temps reel depuis Firebase.</p>
        </div>
        <button
          onClick={() => markAllNotificationsRead(notifications)}
          disabled={!unreadCount}
          className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-black disabled:opacity-40"
        >
          <CheckCheck size={17} /> Tout lire ({unreadCount})
        </button>
      </div>

      <div className="grid gap-3">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={`rounded-2xl border p-4 transition ${notification.read ? "border-white/10 bg-brand-surface/60" : "border-brand-orange/30 bg-brand-orange/10"}`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <button onClick={() => openNotification(notification)} className="flex min-w-0 flex-1 items-start gap-4 text-left">
                <div className={`rounded-xl p-3 ${notification.read ? "bg-white/5 text-white/45" : "bg-brand-orange/20 text-brand-orange"}`}>
                  {notification.title.toLowerCase().includes("video") ? <Video size={18} /> : <Bell size={18} />}
                </div>
                <div className="min-w-0">
                  <div className="font-black">{notification.title}</div>
                  <div className="mt-1 text-sm text-white/55">{notification.body}</div>
                  <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-white/30">{formatDate(notification.createdAt)}</div>
                </div>
              </button>
              <div className="flex gap-2">
                {!notification.read && (
                  <button onClick={() => markNotificationRead(notification.id)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-brand-neon">
                    Lu
                  </button>
                )}
                <button onClick={() => deleteNotification(notification.id)} className="rounded-xl border border-white/10 p-2 text-red-200" title="Supprimer">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </article>
        ))}

        {notifications.length === 0 && (
          <div className="glass-card flex flex-col items-center justify-center p-14 text-center text-white/45">
            <Bell size={52} className="mb-4 text-white/20" />
            Aucune notification pour le moment.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function formatDate(value: unknown) {
  const date =
    value && typeof value === "object" && "toDate" in value
      ? (value as { toDate: () => Date }).toDate()
      : value && typeof value === "object" && "seconds" in value
      ? new Date(Number((value as { seconds: number }).seconds) * 1000)
      : new Date(String(value || Date.now()));
  return date.toLocaleString();
}
