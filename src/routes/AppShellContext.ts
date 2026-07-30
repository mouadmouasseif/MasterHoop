import { createContext, useContext } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import type { PoseMetrics } from "@/src/lib/poseDetection";
import type { ResolvedUserProfile } from "@/src/auth/types";

export interface AppShellState {
  user: FirebaseUser;
  profile: ResolvedUserProfile;
  isImmersive: boolean;
  setIsImmersive(value: boolean): void;
  isRecording: boolean;
  setIsRecording(value: boolean): void;
  liveMetrics: PoseMetrics | null;
  uploadProgress: number;
  historyRefreshKey: number;
  handleMetricsUpdate(metrics: PoseMetrics): void;
  handleRecordingComplete(blob: Blob, metrics?: Partial<PoseMetrics> | null): Promise<void>;
  notifySessionSaved(): void;
  openProfileEditor(): void;
}

export const AppShellContext = createContext<AppShellState | null>(null);

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) throw new Error("useAppShell doit être utilisé dans AuthenticatedLayout.");
  return context;
}
