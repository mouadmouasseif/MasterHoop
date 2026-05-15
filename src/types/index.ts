import type { User as FirebaseUser } from 'firebase/auth';
import type { PoseMetrics } from '@/src/lib/poseDetection';
export interface Shot { x: number; y: number; z: number; shotType: string; outcome: 'made' | 'missed'; }
export interface Session { id: string; userId: string; timestamp: any; duration: string; videoUrl: string; accuracy: number; thumbnail: string; shots?: Shot[]; madeShots?: number; missedShots?: number; dribbleCount?: number; avgPower?: number; notes?: string; }
export interface UserProfile { userId: string; name: string; age: number; height: number; weight: number; totalSessions: number; avgAccuracy: number; bestAccuracy: number; preferredShot: string; basketballPosition?: string; }
export type ActiveTab = 'live' | 'stats' | 'coach' | 'history' | 'drills' | 'profile';
export type TrainingMode = 'FREESTYLE' | 'TARGETED';
export type SessionToSave = { blob: Blob; metrics: PoseMetrics } | null;
export type AppUser = FirebaseUser | null;
