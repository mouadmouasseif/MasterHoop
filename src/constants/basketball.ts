import type { Shot } from '@/src/types';
export const PERFORMANCE_DATA = [
  { session: 'S1', time: '10:00', accuracy: 45, bpm: 110 },
  { session: 'S2', time: '10:05', accuracy: 52, bpm: 125 },
  { session: 'S3', time: '10:10', accuracy: 48, bpm: 140 },
  { session: 'S4', time: '10:15', accuracy: 65, bpm: 145 },
  { session: 'S5', time: '10:20', accuracy: 72, bpm: 155 },
  { session: 'S6', time: '10:25', accuracy: 68, bpm: 160 },
  { session: 'S7', time: '10:30', accuracy: 80, bpm: 165 },
];
export const INITIAL_SHOT_CHART_DATA: Shot[] = [
  { x: 20, y: 30, z: 10, shotType: 'Jump Shot', outcome: 'made' },
  { x: 25, y: 45, z: 12, shotType: 'Layup', outcome: 'missed' },
  { x: 50, y: 60, z: 15, shotType: 'Three Pointer', outcome: 'made' },
  { x: 75, y: 35, z: 8, shotType: 'Free Throw', outcome: 'made' },
  { x: 30, y: 80, z: 20, shotType: 'Jump Shot', outcome: 'missed' },
  { x: 80, y: 15, z: 5, shotType: 'Layup', outcome: 'made' },
  { x: 45, y: 25, z: 10, shotType: 'Three Pointer', outcome: 'missed' },
  { x: 15, y: 70, z: 12, shotType: 'Jump Shot', outcome: 'made' },
];
export const SHOT_TYPE_COLORS: Record<string, string> = { 'Jump Shot': '#FF6B00', Layup: '#00FF94', 'Three Pointer': '#00E0FF', 'Free Throw': '#FFD700' };
