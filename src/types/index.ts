import type { User as FirebaseUser } from 'firebase/auth';
import type { PoseMetrics } from '@/src/lib/poseDetection';
export interface Shot { x: number; y: number; z: number; shotType: string; outcome: 'made' | 'missed'; }
export interface Session {
  id: string;
  userId: string;
  timestamp?: any;
  createdAt?: any;
  duration: string | number;
  videoUrl: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  accuracy?: number;
  drillName?: string;
  score?: number;
  aiFeedback?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  metrics?: Record<string, unknown>;
  shots?: Shot[];
  madeShots?: number;
  missedShots?: number;
  dribbleCount?: number;
  avgPower?: number;
  notes?: string;
}
export interface UserProfile {
  userId: string;
  uid?: string;
  name: string;
  username?: string;
  fullName?: string;
  photoURL?: string;
  email?: string;
  uniquePlayerId?: string;
  qrCode?: string;
  followers?: number;
  following?: number;
  teams?: string[];
  age: number;
  height: number;
  weight: number;
  totalSessions: number;
  avgAccuracy: number;
  bestAccuracy: number;
  preferredShot: string;
  basketballPosition?: string;
}
export type ActiveTab = 'live' | 'games' | 'friends' | 'teams' | 'leaderboard' | 'stats' | 'coach' | 'history' | 'drills' | 'profile';
export type TrainingMode = 'FREESTYLE' | 'TARGETED';
export type SessionToSave = { blob: Blob; metrics: PoseMetrics } | null;
export type AppUser = FirebaseUser | null;

export type GameMode = '1v1' | '3v3' | '5v5';
export type DrillCategory = 'Shooting' | 'Dribbling' | 'Finishing' | 'Defense' | 'Footwork' | 'Conditioning';

export type PlayerAnalysisReport = {
  player: string;
  offense_score: number;
  defense_score: number;
  speed: number;
  distance: number;
  weaknesses: string[];
  recommendations: string[];
};

export type TrainingHistoryItem = {
  id: string;
  date: string;
  type: string;
  player: string;
  video: string;
  analysis: PlayerAnalysisReport;
  drillsCompleted: string[];
  notes: string;
};

export type PlayerStats = {
  shots: number;
  madeShots: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  turnovers: number;
  minutesPlayed: number;
};

export type SocialPlayer = {
  uid: string;
  username: string;
  fullName: string;
  photoURL: string;
  email: string;
  uniquePlayerId: string;
  qrCode: string;
  followers: number;
  following: number;
  teams: string[];
  level: string;
  lastActive: string;
  stats: PlayerStats;
};

export type FriendRequestStatus = 'pending' | 'accepted' | 'blocked';

export type TeamProfile = {
  teamId: string;
  teamName: string;
  logo: string;
  color: string;
  captain: string;
  players: SocialPlayer[];
  memberUids?: string[];
  pendingInvites?: string[];
  mode: '3v3' | '5v5';
};

export type SyncedMatchResult = {
  matchId: string;
  playerA: string;
  playerB: string;
  winner: string;
  score: string;
  video: string;
  stats: Record<string, PlayerStats>;
};

export type MatchType = '1vs1' | '3vs3' | '5vs5';
export type MatchStatus = 'waiting' | 'active' | 'finished';

export type MatchTimelineEvent = {
  id: string;
  timestamp: number;
  type: string;
  playerId: string;
  team: 'A' | 'B';
  points?: 2 | 3;
};

export type MatchStats = PlayerStats & {
  shotsAttempted: number;
  shotsMade: number;
  fieldGoalPercentage: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
};

export type AIMatchRecord = {
  id: string;
  type: MatchType;
  userId: string;
  playerA?: string;
  playerB?: string;
  teamA: string[];
  teamB: string[];
  participantUids: string[];
  createdAt?: any;
  acceptedAt?: any;
  finishedAt?: any;
  status: MatchStatus;
  score: { A: number; B: number };
  stats: Record<string, MatchStats>;
  timeline: MatchTimelineEvent[];
  videoUrl?: string;
  reportUrl?: string;
  aiAnalysis?: Record<string, unknown>;
};

export type FriendRequest = {
  id: string;
  userId: string;
  fromUid: string;
  toUid: string;
  fromPlayerId: string;
  toPlayerId: string;
  status: FriendRequestStatus;
  createdAt?: any;
};

export type NotificationItem = {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt?: any;
  matchId?: string;
  teamId?: string;
};
