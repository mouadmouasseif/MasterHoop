import { db } from '@/src/lib/firebase';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import type { Session, UserProfile } from '@/src/types';
export async function getUserProfile(uid: string) { const docRef = doc(db, 'users', uid); const docSnap = await getDoc(docRef); return docSnap.exists() ? (docSnap.data() as UserProfile) : null; }
export function subscribeToUserSessions(uid: string, onSessions: (sessions: Session[]) => void, onError?: (error: unknown) => void) { const q = query(collection(db, 'sessions'), where('userId', '==', uid), orderBy('timestamp', 'desc'), limit(20)); return onSnapshot(q, (snapshot) => { const sessionData: Session[] = []; snapshot.forEach((doc) => { const data = doc.data(); sessionData.push({ id: doc.id, ...data, timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : new Date().toLocaleString() } as Session); }); onSessions(sessionData); }, onError as any); }
