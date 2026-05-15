import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
export function useAuth() { const [user, setUser] = useState<FirebaseUser | null>(null); useEffect(() => onAuthStateChanged(auth, setUser), []); return { user }; }
