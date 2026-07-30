import type { Shot } from '@/src/types';
export const PERFORMANCE_DATA = [
  { session: 'S1', time: '10:00', accuracy: 45, bpm: 110, isDemoData: true },
  { session: 'S2', time: '10:05', accuracy: 52, bpm: 125, isDemoData: true },
  { session: 'S3', time: '10:10', accuracy: 48, bpm: 140, isDemoData: true },
  { session: 'S4', time: '10:15', accuracy: 65, bpm: 145, isDemoData: true },
  { session: 'S5', time: '10:20', accuracy: 72, bpm: 155, isDemoData: true },
  { session: 'S6', time: '10:25', accuracy: 68, bpm: 160, isDemoData: true },
  { session: 'S7', time: '10:30', accuracy: 80, bpm: 165, isDemoData: true },
];
export const INITIAL_SHOT_CHART_DATA: Array<Shot & { isDemoData: true }> = [
  { x: 20, y: 30, z: 10, shotType: 'Jump Shot', outcome: 'made', isDemoData: true },
  { x: 25, y: 45, z: 12, shotType: 'Layup', outcome: 'missed', isDemoData: true },
  { x: 50, y: 60, z: 15, shotType: 'Three Pointer', outcome: 'made', isDemoData: true },
  { x: 75, y: 35, z: 8, shotType: 'Free Throw', outcome: 'made', isDemoData: true },
  { x: 30, y: 80, z: 20, shotType: 'Jump Shot', outcome: 'missed', isDemoData: true },
  { x: 80, y: 15, z: 5, shotType: 'Layup', outcome: 'made', isDemoData: true },
  { x: 45, y: 25, z: 10, shotType: 'Three Pointer', outcome: 'missed', isDemoData: true },
  { x: 15, y: 70, z: 12, shotType: 'Jump Shot', outcome: 'made', isDemoData: true },
];
export const SHOT_TYPE_COLORS: Record<string, string> = { 'Jump Shot': '#FF6B00', Layup: '#00FF94', 'Three Pointer': '#00E0FF', 'Free Throw': '#FFD700' };
