import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Square, Activity, Target, Settings as SettingsIcon, Video, RefreshCw, ChevronRight, BarChart2, X, ArrowUpLeft, ArrowUpRight, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/src/lib/utils';
import { PoseAnalyzer, PoseMetrics } from '@/src/lib/poseDetection';
import { Drill } from '@/src/components/DrillTutorials';
import CameraSelector from '@/src/components/CameraSelector';
import FullscreenButton from '@/src/components/FullscreenButton';
import ScanButton from '@/src/components/ScanButton';
import ScoreBoard from '@/src/components/ScoreBoard';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface CameraRecorderProps {
  isRecording: boolean;
  onRecordingChange: (recording: boolean) => void;
  onRecordingComplete: (blob: Blob) => void;
  onMetricsUpdate?: (metrics: PoseMetrics) => void;
  selectedMoves?: string[];
  currentDrill?: Drill | null;
  onClearDrill?: () => void;
  madeCount?: number;
  missCount?: number;
  onMadeShot?: () => void;
  onMissedShot?: () => void;
}

type CourtType = '5v5' | '3v3' | 'none';

export function CameraRecorder({ 
  isRecording, 
  onRecordingChange, 
  onRecordingComplete,
  onMetricsUpdate,
  selectedMoves: externalSelectedMoves,
  currentDrill,
  onClearDrill,
  madeCount = 0,
  missCount = 0,
  onMadeShot,
  onMissedShot
}: CameraRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraShellRef = useRef<HTMLDivElement>(null);
  const analyzerRef = useRef<PoseAnalyzer | null>(null);
  const requestRef = useRef<number>(null);
  const [dismissLandscapeHint, setDismissLandscapeHint] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PoseMetrics | null>(null);
  const [isAnalyzerReady, setIsAnalyzerReady] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [activeFacingMode, setActiveFacingMode] = useState<'user' | 'environment' | 'external'>('environment');
  const [courtType, setCourtType] = useState<CourtType>('3v3');
  const [videoQuality, setVideoQuality] = useState<'480p' | '720p' | '1080p'>('720p');
  const [showSettings, setShowSettings] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [aiSensitivity, setAiSensitivity] = useState(0.72);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showLandscapeHint, setShowLandscapeHint] = useState(false);
  const [activeMove, setActiveMove] = useState<{ name: string; metrics: any; timestamp: number } | null>(null);
  const [internalSelectedMoves, setInternalSelectedMoves] = useState<string[]>(['JUMPSHOT', 'CROSSOVER', 'FADEAWAY', 'DRIBBLE', 'PASS', 'REBOUND', 'HESITATION', 'EUROSTEP']);

  const selectedMoves = externalSelectedMoves || internalSelectedMoves;

  const [retryCount, setRetryCount] = useState(0);
  const [dribbleHistory, setDribbleHistory] = useState<{ power: number; rhythm: number; id: number }[]>([]);

  const requestLandscapeMode = useCallback(async () => {
    const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches;
    const isSmallViewport = Math.min(window.innerWidth, window.innerHeight) < 900;
    if (!isTouchDevice && !isSmallViewport) return;

    try {
      if (cameraShellRef.current && !document.fullscreenElement) {
        await cameraShellRef.current.requestFullscreen?.();
      }

      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: 'landscape') => Promise<void>;
      };
      await orientation.lock?.('landscape');
      setShowLandscapeHint(false);
    } catch (error) {
      console.warn('Landscape lock unavailable:', error);
      setShowLandscapeHint(true);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const target = cameraShellRef.current;
    if (!target) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsPseudoFullscreen(false);
        return;
      }

      if (target.requestFullscreen) {
        await target.requestFullscreen();
        setIsPseudoFullscreen(false);
      } else {
        setIsPseudoFullscreen((value) => !value);
      }

      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: 'landscape') => Promise<void>;
      };
      await orientation.lock?.('landscape').catch(() => undefined);
    } catch (error) {
      console.warn('Fullscreen unavailable, using mobile fallback:', error);
      setIsPseudoFullscreen((value) => !value);
    }
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setIsPseudoFullscreen(false);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const refreshCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError("Votre navigateur ne supporte pas la detection automatique des cameras.");
      return;
    }

    const mediaDevices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = mediaDevices.filter((device) => device.kind === 'videoinput');
    setDevices(videoDevices);
    setSelectedDeviceId((current) => current || videoDevices[0]?.deviceId || '');
  }, []);

  // Initialize Pose Analyzer
  useEffect(() => {
    const analyzer = new PoseAnalyzer();
    analyzer.initialize().then(() => {
      analyzerRef.current = analyzer;
      setIsAnalyzerReady(true);
    });
    
    refreshCameras().catch((error) => console.warn('Camera enumeration failed:', error));

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [refreshCameras]);

  const [lastDribbleTime, setLastDribbleTime] = useState(0);
  const [dribbleStreak, setDribbleStreak] = useState(0);

  // Persist move display
  useEffect(() => {
    if (metrics) {
      const now = Date.now();
      const isMoveEnabled = (name: string) => selectedMoves.includes(name);

      if (metrics.isDribbling && isMoveEnabled('DRIBBLE')) {
        setLastDribbleTime(now);
        setDribbleStreak(prev => {
          // If less than 2.5s since last dribble, increment streak
          if (now - lastDribbleTime < 2500) return prev + 1;
          return 1;
        });
        setDribbleHistory(prev => {
          const newHistory = [...prev, { power: metrics.dribblePower, rhythm: metrics.dribbleRhythm, id: metrics.dribbleCount }];
          return newHistory.slice(-20); // Keep last 20 dribbles
        });
        setActiveMove({ 
          name: 'DRIBBLE', 
          metrics: { 
            power: metrics.dribblePower, 
            rhythm: metrics.dribbleRhythm,
            count: metrics.dribbleCount
          }, 
          timestamp: now 
        });
      }
      
      if (metrics.isFadeaway && isMoveEnabled('FADEAWAY')) {
        setActiveMove({ name: 'FADEAWAY', metrics: { elbow: metrics.elbowAngle, knee: metrics.kneeAngle, power: metrics.dribblePower }, timestamp: now });
      } else if (metrics.isHesitation && isMoveEnabled('HESITATION')) {
        setActiveMove({ name: 'HESITATION', metrics: { power: metrics.dribblePower, rhythm: metrics.dribbleRhythm }, timestamp: now });
      } else if (metrics.isEuroStep && isMoveEnabled('EUROSTEP')) {
        setActiveMove({ name: 'EUROSTEP', metrics: { knee: metrics.kneeAngle }, timestamp: now });
      } else if (metrics.isCrossover && isMoveEnabled('CROSSOVER')) {
        setActiveMove({ name: 'CROSSOVER', metrics: { elbow: metrics.elbowAngle, knee: metrics.kneeAngle, power: metrics.dribblePower, rhythm: metrics.dribbleRhythm }, timestamp: now });
      } else if (metrics.isPassing && isMoveEnabled('PASS')) {
        setActiveMove({ name: 'PASS', metrics: { vx: Math.round(metrics.ballVelocity.vx) }, timestamp: now });
      } else if (metrics.isRebounding && isMoveEnabled('REBOUND')) {
        setActiveMove({ name: 'REBOUND', metrics: { impact: "HIGH" }, timestamp: now });
      } else if (metrics.isShooting && isMoveEnabled('JUMPSHOT') && (!activeMove || activeMove.name !== 'JUMPSHOT')) {
        setActiveMove({ name: 'JUMPSHOT', metrics: { elbow: metrics.elbowAngle, knee: metrics.kneeAngle }, timestamp: now });
      }

      // Clear after 3 seconds
      if (activeMove && now - activeMove.timestamp > 3000) {
        setActiveMove(null);
      }
    }
  }, [metrics]);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let cancelled = false;

    async function setupCamera() {
      setError(null);
      try {
        const qualityConfig = {
          '480p': { width: 640, height: 480 },
          '720p': { width: 1280, height: 720 },
          '1080p': { width: 1920, height: 1080 }
        };
        const res = qualityConfig[videoQuality];

        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            facingMode: selectedDeviceId ? undefined : { ideal: 'environment' },
            width: { ideal: res.width },
            height: { ideal: res.height },
            frameRate: { ideal: 30, max: 30 }
          },
          audio: audioEnabled
        };

        const userStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          userStream.getTracks().forEach(track => track.stop());
          return;
        }

        currentStream = userStream;
        setStream(userStream);
        const track = userStream.getVideoTracks()[0];
        const settings = track?.getSettings?.();
        const label = track?.label?.toLowerCase() || '';
        setActiveFacingMode(
          settings?.facingMode === 'user' || label.includes('front') || label.includes('face')
            ? 'user'
            : label.includes('usb') || label.includes('webcam')
            ? 'external'
            : 'environment'
        );

        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.srcObject = userStream;
          await videoRef.current.play().catch(() => undefined);
        }
        await refreshCameras();
        requestLandscapeMode();
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Impossible d'acceder a la camera. Verifiez les permissions et reessayez.");
      }
    }

    setupCamera();

    return () => {
      cancelled = true;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [retryCount, selectedDeviceId, videoQuality, audioEnabled, requestLandscapeMode, refreshCameras]);

  const drawCourtMiniMap = (ctx: CanvasRenderingContext2D, type: CourtType) => {
    if (type === 'none') return;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    
    // Mini-map dimensions (bottom right, like a broadcast shot chart)
    const mapW = Math.max(120, w * 0.13);
    const mapH = Math.max(80, h * 0.13);
    const padding = Math.max(20, w * 0.025);
    const startX = w - mapW - padding;
    const startY = h - mapH - padding;

    // Background for mini-map
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(startX - 10, startY - 10, mapW + 20, mapH + 20, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
    ctx.lineWidth = 1.5;

    if (type === '3v3') {
      ctx.strokeRect(startX, startY, mapW, mapH);
      ctx.strokeRect(startX + mapW * 0.35, startY + mapH * 0.6, mapW * 0.3, mapH * 0.4);
      ctx.beginPath();
      ctx.arc(startX + mapW * 0.5, startY + mapH, mapW * 0.4, Math.PI, 0, false);
      ctx.stroke();
    } else {
      ctx.strokeRect(startX, startY, mapW, mapH);
      ctx.beginPath();
      ctx.moveTo(startX + mapW * 0.5, startY);
      ctx.lineTo(startX + mapW * 0.5, startY + mapH);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(startX + mapW * 0.5, startY + mapH * 0.5, mapW * 0.1, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 8px Mono';
    ctx.textAlign = 'center';
    ctx.fillText(type.toUpperCase(), startX + mapW / 2, startY - 2);

    ctx.fillStyle = 'rgba(0, 255, 148, 0.85)';
    ctx.font = 'bold 9px Mono';
    ctx.fillText('2PT / 3PT', startX + mapW / 2, startY + mapH + 15);
  };

  const [isScanning, setIsScanning] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(true);
  const ballTrailRef = useRef<{ x: number, y: number, timestamp: number }[]>([]);

  const drawCourtOverlay = (ctx: CanvasRenderingContext2D, metrics: PoseMetrics | null) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    
    if (courtType === 'none') return;

    // Scan line effect
    if (isScanning) {
       const scanY = (Date.now() % 2000) / 2000 * h;
       ctx.beginPath();
       ctx.moveTo(0, scanY);
       ctx.lineTo(w, scanY);
       ctx.strokeStyle = 'rgba(255, 107, 0, 0.8)';
       ctx.lineWidth = 2;
       ctx.shadowBlur = 10;
       ctx.shadowColor = '#FF6B00';
       ctx.stroke();
       ctx.shadowBlur = 0;
    }

    const hoopX = w * (analyzerRef.current?.hoopPos.x || 0.5);
    const hoopY = h * (analyzerRef.current?.hoopPos.y || 0.22);
    const shotValue = metrics?.courtStatus.in3PtRange ? 3 : 2;

    ctx.save();

    // Keep the live camera as the hero and leave court geometry to the mini HUD.
    const vignette = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.72);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.72, 'rgba(0, 0, 0, 0.08)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // Small hoop anchor only; the full court is intentionally not drawn over the player.
    const hoopPulse = metrics?.isShooting ? Math.sin(Date.now() / 140) * 0.12 + 0.9 : 1;
    ctx.beginPath();
    ctx.arc(hoopX, hoopY, Math.max(42, w * 0.045) * hoopPulse, 0, 2 * Math.PI);
    ctx.strokeStyle = metrics?.isShooting ? 'rgba(255, 107, 0, 0.45)' : 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.ellipse(hoopX, hoopY, 25, 10, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 107, 0, 0.72)';
    ctx.lineWidth = 3;
    ctx.shadowBlur = metrics?.isShooting ? 18 : 8;
    ctx.shadowColor = '#FF6B00';
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (metrics?.ballPos) {
      const labelX = metrics.ballPos.x;
      const labelY = Math.max(h * 0.14, metrics.ballPos.y - 78);
      ctx.fillStyle = shotValue === 3 ? 'rgba(0, 255, 148, 0.88)' : 'rgba(255, 107, 0, 0.88)';
      ctx.beginPath();
      ctx.roundRect(labelX - 45, labelY - 23, 90, 32, 16);
      ctx.fill();
      ctx.fillStyle = '#050505';
      ctx.font = '900 15px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${shotValue} PTS`, labelX, labelY - 1);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.font = '800 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PANIER', hoopX, hoopY - 20);

    if (metrics?.courtStatus.isOutOfBounds) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'white';
      ctx.font = '900 26px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SORTIE', w / 2, h - 100);
    }
    
    ctx.restore();
  };

  const drawScoreHud = (ctx: CanvasRenderingContext2D, metrics: PoseMetrics | null) => {
    const w = ctx.canvas.width;
    const made = metrics?.madeShots || 0;
    const missed = metrics?.missedShots || 0;
    const attempts = made + missed;
    const shotValue = metrics?.courtStatus.in3PtRange ? 3 : 2;
    const madeThreePointers = (metrics?.shots || []).filter((shot) => shot.shotType === 'Three Pointer' && shot.outcome === 'made').length;
    const score = made * 2 + madeThreePointers;
    const formScore = metrics ? Math.max(0, Math.min(99, Math.round((metrics.elbowAngle + Math.max(0, 180 - metrics.kneeAngle)) / 2))) : 84;

    ctx.save();
    const hudW = Math.min(360, Math.max(250, w * 0.26));
    const hudH = 54;
    const hudX = Math.max(20, (w - hudW) / 2);
    const hudY = 22;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.roundRect(hudX, hudY, hudW, hudH, 18);
    ctx.fill();
    ctx.strokeStyle = shotValue === 3 ? '#00FF94' : '#FF6B00';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.font = '900 18px Inter, sans-serif';
    ctx.fillText(`${made}/${attempts || 0}`, hudX + 18, hudY + 34);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
    ctx.font = '800 10px Inter, sans-serif';
    ctx.fillText(`FORM ${formScore}%  |  SCORE ${score}`, hudX + 76, hudY + 23);

    ctx.fillStyle = shotValue === 3 ? '#00FF94' : '#FF6B00';
    ctx.font = '900 13px Inter, sans-serif';
    ctx.fillText(`${shotValue}PT ZONE`, hudX + 76, hudY + 40);

    ctx.restore();
  };

  const drawPose = useCallback((poses: any[], objects: cocoSsd.DetectedObject[], metrics: PoseMetrics | null, ctx: CanvasRenderingContext2D) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw Court Overlay
    drawCourtOverlay(ctx, metrics);
    
    // Update ball trail
    if (metrics?.ballPos) {
      ballTrailRef.current.push({ ...metrics.ballPos, timestamp: Date.now() });
      if (ballTrailRef.current.length > 15) ballTrailRef.current.shift();
    } else {
      if (ballTrailRef.current.length > 0) ballTrailRef.current.shift();
    }
    
    // Draw mini-map instead of full overlay
    drawCourtMiniMap(ctx, courtType);
    drawScoreHud(ctx, metrics);

    // Define logical hoop position for visualization
    const hoopPos = {
      x: w * (analyzerRef.current?.hoopPos.x || 0.5),
      y: h * (analyzerRef.current?.hoopPos.y || 0.22)
    };

    // Draw Hoop UI Target
    if (courtType !== 'none') {
      // Draw Target Zone (Pulsing Glow during shot/prediction)
      if (metrics?.ballPos && (metrics.isShooting || metrics.ballDetected)) {
        const pulse = Math.sin(Date.now() / 200) * 0.1 + 0.9;
        const targetRadius = w * 0.08; // Match hoopTolerance from logic
        
        ctx.beginPath();
        ctx.arc(hoopPos.x, hoopPos.y, targetRadius * pulse, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 107, 0, 0.15)';
        ctx.fill();
        
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(255, 107, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = 'rgba(255, 107, 0, 0.6)';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TARGET', hoopPos.x, hoopPos.y - 18);
    }

    // Draw Trajectory Arc Prediction (Physics-based)
    if (metrics?.ballPos && (metrics.isShooting || metrics.ballDetected) && selectedMoves.includes('JUMPSHOT')) {
      const startX = metrics.ballPos.x;
      const startY = metrics.ballPos.y;
      
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      let currentX = startX;
      let currentY = startY;
      let vx = metrics.ballVelocity.vx;
      let vy = metrics.ballVelocity.vy;
      
      // If velocity is low but we are shooting, assume an upward shot towards hoop
      if (metrics.isShooting && Math.abs(vx) < 50 && Math.abs(vy) < 50) {
        const dx = hoopPos.x - startX;
        const dy = hoopPos.y - startY;
        vx = dx * 1.5; // Estimated strength
        vy = -Math.abs(dx) * 1.2; // High arc
      }

      const gravity = 1000; 
      const dt = 0.04; 
      const friction = 0.99;
      
      // Moving dashes for "streaming" effect
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -Date.now() / 40;
      ctx.lineWidth = 4;
      
      // Glow and shadow
      ctx.shadowBlur = 15;
      ctx.shadowColor = metrics.isShooting ? '#FF6B00' : 'rgba(255, 107, 0, 0.4)';
      
      // Gradient for trajectory
      const grad = ctx.createLinearGradient(startX, startY, hoopPos.x, hoopPos.y);
      grad.addColorStop(0, '#FF6B00');
      grad.addColorStop(0.5, '#FFD700');
      grad.addColorStop(1, '#00FF94');
      ctx.strokeStyle = grad;

      for (let i = 0; i < 40; i++) {
        currentX += vx * dt;
        currentY += vy * dt + 0.5 * gravity * dt * dt;
        vy += gravity * dt;
        vx *= friction;
        vy *= friction;
        
        ctx.lineTo(currentX, currentY);
        
        if (currentY > h - 40 || currentX < -100 || currentX > w + 100) break;
      }
      ctx.stroke();
      ctx.restore();

      // Draw landing/target prediction dot
      ctx.beginPath();
      ctx.arc(currentX, currentY, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#00FF94';
      ctx.fill();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00FF94';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw Dribble Feedbacks
    const dribbleAge = Date.now() - lastDribbleTime;
    
    // Persistent Pulsing Indicator & Power Gauge during active dribbling
    if (dribbleAge < 2000 && metrics?.ballPos && selectedMoves.includes('DRIBBLE')) {
      const corePulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
      const power = metrics.dribblePower || 0;
      
      // Arc Gauge Background
      ctx.beginPath();
      ctx.arc(metrics.ballPos.x, metrics.ballPos.y, 35, 0.75 * Math.PI, 2.25 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Arc Gauge Fill (Power)
      const powerAngle = 0.75 * Math.PI + (1.5 * Math.PI * (power / 100));
      ctx.beginPath();
      ctx.arc(metrics.ballPos.x, metrics.ballPos.y, 35, 0.75 * Math.PI, powerAngle);
      ctx.strokeStyle = power > 75 ? '#FF6B00' : '#00FF94';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Power Label
      const powerLabel = power > 75 ? "EXPLOSIF" : power > 40 ? "FORT" : "CONTRأ”Lأ‰";
      ctx.fillStyle = power > 75 ? '#FF6B00' : '#00FF94';
      ctx.font = 'bold 10px Mono';
      ctx.textAlign = 'center';
      ctx.fillText(powerLabel, metrics.ballPos.x, metrics.ballPos.y + 55);

      ctx.beginPath();
      ctx.arc(metrics.ballPos.x, metrics.ballPos.y, 8 + (corePulse * 4), 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(0, 255, 148, ${0.4 + (corePulse * 0.4)})`;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00FF94';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Streak Count near ball
      if (dribbleStreak > 1) {
        ctx.fillStyle = '#00FF94';
        ctx.font = 'bold 12px Mono';
        ctx.textAlign = 'left';
        ctx.fillText(`STREAK: ${dribbleStreak}`, metrics.ballPos.x + 15, metrics.ballPos.y + 5);
      }
    }

    if (dribbleAge < 600 && metrics?.ballPos && selectedMoves.includes('DRIBBLE')) {
      const progress = (dribbleAge / 600);
      
      // Ripple Rings (Multiple concentric circles)
      [0, 0.2, 0.4].forEach((offset) => {
        const ringProgress = (progress + offset) % 1;
        const opacity = 0.8 * (1 - ringProgress);
        const radius = 30 + (80 * ringProgress);
        
        ctx.beginPath();
        ctx.arc(metrics.ballPos!.x, metrics.ballPos!.y, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(0, 255, 148, ${opacity})`;
        ctx.lineWidth = 3 * (1 - ringProgress);
        ctx.stroke();
      });

      // Dribble Text & Counter
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = '#00FF94';
      ctx.font = 'bold 24px Mono';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00FF94';
      
      // Float up effect for text
      const yOffset = 60 + (progress * 40);
      ctx.fillText('DRIBBLE !', metrics.ballPos.x, metrics.ballPos.y - yOffset);
      
      // Small count bubble
      ctx.font = 'bold 14px Mono';
      ctx.fillText(`#${metrics.dribbleCount}`, metrics.ballPos.x, metrics.ballPos.y - yOffset + 20);
      
      ctx.restore();
    }

    // Draw Active Move Effects (Aura / Trails)
    if (activeMove) {
      const age = Date.now() - activeMove.timestamp;
      const isCrossover = activeMove.name === 'CROSSOVER';
      const isFadeaway = activeMove.name === 'FADEAWAY';
      const isPass = activeMove.name === 'PASS';
      const isRebound = activeMove.name === 'REBOUND';
      const isHesi = activeMove.name === 'HESITATION';
      const isEuro = activeMove.name === 'EUROSTEP';
      
      if ((isCrossover || isPass || isHesi) && ballTrailRef.current.length > 2) {
        // Draw lightning/energy trail for crossover, pass or hesi
        ctx.beginPath();
        ctx.moveTo(ballTrailRef.current[0].x, ballTrailRef.current[0].y);
        for (let i = 1; i < ballTrailRef.current.length; i++) {
          const pt = ballTrailRef.current[i];
          const jitter = isHesi ? Math.sin(Date.now() / 50 + i) * 10 : (Math.random() - 0.5) * (isPass ? 2 : 4);
          ctx.lineTo(pt.x + jitter, pt.y + jitter);
        }
        
        let strokeStyle = '#3b82f6';
        if (isPass) strokeStyle = '#00FF94';
        if (isHesi) strokeStyle = '#FFD700';
        
        ctx.lineWidth = isPass ? 2 : 4;
        ctx.strokeStyle = strokeStyle;
        ctx.shadowBlur = 15;
        ctx.shadowColor = strokeStyle;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      if (isEuro && poses.length > 0) {
        // Draw lateral flow trails for Euro Step
        const pose = poses[0];
        const lAnkle = pose.keypoints.find((k: any) => k.name === 'left_ankle');
        const rAnkle = pose.keypoints.find((k: any) => k.name === 'right_ankle');
        
        if (lAnkle && rAnkle && lAnkle.score > 0.3 && rAnkle.score > 0.3) {
          const centerX = (lAnkle.x + rAnkle.x) / 2;
          const centerY = (lAnkle.y + rAnkle.y) / 2;
          
          ctx.beginPath();
          ctx.moveTo(centerX - 40, centerY);
          ctx.bezierCurveTo(centerX - 20, centerY - 20, centerX + 20, centerY + 20, centerX + 40, centerY);
          ctx.strokeStyle = '#A855F7';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      if (isRebound && metrics?.ballPos) {
        const pulse = Math.sin(Date.now() / 100) * 10 + 40;
        ctx.beginPath();
        ctx.arc(metrics.ballPos.x, metrics.ballPos.y, pulse, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (isFadeaway && poses.length > 0) {
        const pose = poses[0];
        const hip = pose.keypoints.find((k: any) => k.name === 'right_hip');
        const ankle = pose.keypoints.find((k: any) => k.name === 'right_ankle');
        
        if (hip && ankle) {
          // Draw "lean" aura
          ctx.beginPath();
          ctx.arc(hip.x, hip.y, 60, 0, 2 * Math.PI);
          const auraGrad = ctx.createRadialGradient(hip.x, hip.y, 20, hip.x, hip.y, 60);
          auraGrad.addColorStop(0, 'rgba(0, 255, 148, 0.3)');
          auraGrad.addColorStop(1, 'rgba(0, 255, 148, 0)');
          ctx.fillStyle = auraGrad;
          ctx.fill();
        }
      }
    }

    // Draw Active Move Banner
    if (activeMove) {
      const age = Date.now() - activeMove.timestamp;
      const displayDuration = 2500;
      
      if (age < displayDuration) {
        const opacity = age < 300 ? age / 300 : age > displayDuration - 500 ? (displayDuration - age) / 500 : 1;
        
        ctx.save();
        ctx.globalAlpha = opacity;
        
        let moveColor = '#FF6B00'; // Default blue (JUMPSHOT)
        if (activeMove.name === 'FADEAWAY' || activeMove.name === 'REBOUND') moveColor = '#00FF94';
        if (activeMove.name === 'CROSSOVER' || activeMove.name === 'PASS') moveColor = '#3b82f6';
        if (activeMove.name === 'HESITATION') moveColor = '#FFD700';
        if (activeMove.name === 'EUROSTEP') moveColor = '#A855F7';
        
        // Draw banner background
        const bannerW = 260;
        const bannerH = 50;
        const bX = (w - bannerW) / 2;
        const bY = 100;
        
        // Gradient background
        const bgGrad = ctx.createLinearGradient(bX, bY, bX + bannerW, bY);
        bgGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        bgGrad.addColorStop(0.2, 'rgba(0, 0, 0, 0.8)');
        bgGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.8)');
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = bgGrad;
        ctx.fillRect(bX, bY, bannerW, bannerH);
        
        // Accent line
        ctx.fillStyle = moveColor;
        ctx.fillRect(bX + bannerW * 0.2, bY + bannerH - 2, bannerW * 0.6, 2);
        
        // Glow effect for text
        ctx.shadowBlur = 15;
        ctx.shadowColor = moveColor;
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 22px Mono';
        ctx.textAlign = 'center';
        ctx.letterSpacing = "2px";
        ctx.fillText(activeMove.name, w / 2, bY + 34);
        
        // Technical label
        ctx.letterSpacing = "0px";
        ctx.shadowBlur = 0;
        ctx.font = 'bold 9px Mono';
        ctx.fillStyle = moveColor;
        ctx.fillText('MOVE Dأ‰TECTأ‰', w / 2, bY + 12);
        
        ctx.restore();
      }
    }

    // Draw objects (Ball)
    const rawBall = objects.find(obj => obj.class === 'sports ball');

    if (rawBall) {
      // Direct detection
      const [x, y, w, h] = rawBall.bbox;
      const centerX = x + w / 2;
      const centerY = y + h / 2;

      // Outer Glow/Rhythm
      ctx.beginPath();
      ctx.arc(centerX, centerY, (w/2) + 15, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 107, 0, 0.2)';
      ctx.lineWidth = 10;
      ctx.stroke();

      // Detection Box
      ctx.strokeStyle = '#FF6B00';
      ctx.setLineDash([]);
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      
      // Scanner corners
      const cornerLength = w * 0.2;
      ctx.lineWidth = 6;
      // Top Left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLength); ctx.lineTo(x, y); ctx.lineTo(x + cornerLength, y);
      ctx.stroke();
      // Top Right
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLength, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLength);
      ctx.stroke();
      
      ctx.fillStyle = '#FF6B00';
      ctx.font = 'bold 12px Mono';
      ctx.textAlign = 'left';
      ctx.fillText('BALLON LIVE', x, y - 8);
      
      // Real-time coordinates overlay
      ctx.font = 'bold 10px Mono';
      ctx.fillText(`X: ${Math.round(centerX)} Y: ${Math.round(centerY)}`, x + w + 5, y + 10);
      
      // Tracking dot
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#FF6B00';
      ctx.fill();
    } else if (metrics?.ballDetected && metrics.ballPos) {
      // Prediction mode
      const size = 60; // Estimated ball size
      const x = metrics.ballPos.x - size/2;
      const y = metrics.ballPos.y - size/2;
      
      ctx.strokeStyle = 'rgba(255, 107, 0, 0.4)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
      
      ctx.fillStyle = 'rgba(255, 107, 0, 0.4)';
      ctx.font = 'bold 10px Mono';
      ctx.fillText('PREDICTION', x, y - 5);
      
      // Real-time coordinates overlay
      ctx.fillText(`X: ${Math.round(metrics.ballPos.x)} Y: ${Math.round(metrics.ballPos.y)}`, x + size + 5, y + 10);
      
      ctx.setLineDash([]);
    }
    
    poses.forEach(pose => {
      if (!pose || !pose.keypoints) return;

      // Determine skeleton color based on active move
      let skeletonColor = 'rgba(0, 255, 148, 0.4)';
      let pointColor = '#00FF94';
      
      if (activeMove) {
        switch (activeMove.name) {
          case 'JUMPSHOT': skeletonColor = 'rgba(255, 107, 0, 0.8)'; pointColor = '#FF6B00'; break;
          case 'CROSSOVER': skeletonColor = 'rgba(59, 130, 246, 0.8)'; pointColor = '#3b82f6'; break;
          case 'FADEAWAY': skeletonColor = 'rgba(16, 185, 129, 0.8)'; pointColor = '#10b981'; break;
          case 'HESITATION': skeletonColor = 'rgba(255, 215, 0, 0.8)'; pointColor = '#FFD700'; break;
          case 'EUROSTEP': skeletonColor = 'rgba(168, 85, 247, 0.8)'; pointColor = '#A855F7'; break;
          case 'PASS': skeletonColor = 'rgba(0, 255, 148, 0.8)'; pointColor = '#00FF94'; break;
        }
      }

      // Draw keypoints
      pose.keypoints.forEach((kp: any) => {
        if (kp.score > 0.3) {
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = pointColor;
          ctx.fill();
          
          if (activeMove) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = pointColor;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      });

      // Draw skeleton
      const connections = [
        ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_hip'], ['left_shoulder', 'left_hip'],
        ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'],
        ['left_hip', 'left_knee'], ['left_knee', 'left_ankle']
      ];

      ctx.strokeStyle = skeletonColor;
      ctx.lineWidth = activeMove ? 4 : 2;
      connections.forEach(([p1Name, p2Name]) => {
        const p1 = pose.keypoints.find((kp: any) => kp.name === p1Name);
        const p2 = pose.keypoints.find((kp: any) => kp.name === p2Name);
        if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
    });
  }, [courtType, activeMove, lastDribbleTime, selectedMoves]);

  useEffect(() => {
    const decayCheck = setInterval(() => {
      if (dribbleStreak > 0 && Date.now() - lastDribbleTime > 3000) {
        setDribbleStreak(0);
      }
    }, 1000);
    return () => clearInterval(decayCheck);
  }, [dribbleStreak, lastDribbleTime]);

  const dribbleAge = Date.now() - lastDribbleTime;

  const analyzeLoop = useCallback(async () => {
    if (videoRef.current && analyzerRef.current && canvasRef.current && 
        videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
      const result = await analyzerRef.current.analyzeFrame(videoRef.current);
      if (result) {
        setMetrics(result.metrics);
        if (onMetricsUpdate) onMetricsUpdate(result.metrics);
        
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          drawPose(result.poses, result.objects, result.metrics, ctx);
        }
      }
    }
    requestRef.current = requestAnimationFrame(analyzeLoop);
  }, [onMetricsUpdate, drawPose]);

  useEffect(() => {
    if (stream && isAnalyzerReady) {
      requestRef.current = requestAnimationFrame(analyzeLoop);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [stream, isAnalyzerReady, analyzeLoop]);

  useEffect(() => {
    if (isRecording && stream && !mediaRecorderRef.current) {
      startRecording();
    } else if (!isRecording && mediaRecorderRef.current) {
      stopRecording();
    }
  }, [isRecording, stream]);

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : '';
    const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'video/webm' });
      onRecordingComplete(blob);
      mediaRecorderRef.current = null;
    };
    mediaRecorder.start(1000);
    mediaRecorderRef.current = mediaRecorder;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
  };

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-brand-surface rounded-2xl border border-white/10 p-8 text-center">
        <Square className="w-12 h-12 mx-auto text-red-500 mb-4" strokeWidth={1.5} />
        <h3 className="text-xl font-bold mb-2">Accأ¨s Camأ©ra</h3>
        <p className="text-white/40 mb-6 text-sm">{error}</p>
        <button onClick={() => setRetryCount(prev => prev + 1)} className="px-6 py-3 bg-brand-blue text-white rounded-xl font-bold">Rأ©essayer</button>
      </div>
    );
  }

  return (
    <div
      ref={cameraShellRef}
      className={cn(
        "relative w-full h-full bg-black rounded-2xl overflow-hidden group pointer-events-none",
        isPseudoFullscreen && "fixed inset-0 z-[90] h-[100dvh] w-screen rounded-none"
      )}
      style={{
        paddingBottom: isPseudoFullscreen ? 'env(safe-area-inset-bottom)' : undefined,
      }}
    >
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        className={cn("w-full h-full object-cover pointer-events-none", activeFacingMode === 'user' && "mirror")}
      />
      <canvas
        ref={canvasRef}
        width={videoQuality === '1080p' ? 1920 : videoQuality === '720p' ? 1280 : 640}
        height={videoQuality === '1080p' ? 1080 : videoQuality === '720p' ? 720 : 480}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

    {showLandscapeHint && !dismissLandscapeHint && (
      
  <div className="absolute inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
    
    <div className="relative w-full max-w-sm rounded-3xl border border-brand-orange/30 bg-black/80 backdrop-blur-2xl shadow-2xl p-5 text-white pointer-events-auto">

      {/* Close Button */}
      <button
        onClick={() => setDismissLandscapeHint(true)}
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center text-white/60 hover:text-white"
      >
        <X size={16} />
      </button>

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-orange/20 border border-brand-orange/20 mb-4">
          ًں“±
        </div>

        <h3 className="text-sm font-black uppercase tracking-widest text-brand-orange">
          Mode paysage recommandأ©
        </h3>

        <p className="mt-3 text-sm text-white/70 leading-relaxed">
          Sur mobile/tablette, tourne ton tأ©lأ©phone horizontalement pour une meilleure dأ©tection des lignes
          <span className="text-brand-orange font-bold"> 2PT / 3PT</span>.
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={requestLandscapeMode}
        className="mt-5 w-full rounded-2xl bg-brand-orange px-4 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition"
      >
        Plein أ©cran paysage
      </button>

      {/* Skip text */}
      <button
        onClick={() => setDismissLandscapeHint(true)}
        className="mt-3 w-full text-center text-xs text-white/40 hover:text-white/70 transition"
      >
        Continuer sans activer
      </button>
    </div>
  </div>
)}
      
      {/* Drill Active Overlay */}
      <AnimatePresence>
        {currentDrill && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-6 left-6 z-50 flex items-start gap-4 pointer-events-none"
          >
            <div className="bg-black/60 backdrop-blur-xl border border-brand-blue/30 rounded-3xl p-5 shadow-2xl max-w-sm pointer-events-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center shadow-lg shadow-brand-blue/20">
                    <Target size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">{currentDrill.name}</h3>
                    <p className="text-[10px] text-brand-blue font-bold uppercase">{currentDrill.category}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onClearDrill?.(); }}
                  className="p-1.5 hover:bg-white/10 rounded-full text-white/30 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                {currentDrill.aiFocus.map((point, idx) => (
                  <div key={point} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-blue/40" />
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">{point}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-3 bg-brand-blue rounded-full" />
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">AI Feedback Direct</span>
                </div>
                <motion.p 
                  key={activeMove?.timestamp}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-white/80 font-medium italic leading-relaxed"
                >
                  {activeMove ? (
                    currentDrill.id === 'shot-mechanics' && activeMove.name === 'JUMPSHOT' ? 
                    (activeMove.metrics.elbow < 85 ? "Levez plus votre coude pour un meilleur arc" : "Excellent angle de tir !") :
                    currentDrill.id === 'crossover-speed' && activeMove.name === 'CROSSOVER' ?
                    (activeMove.metrics.power < 10 ? "Soyez plus explosif sur le dribble !" : "Crossover trأ¨s bas et rapide, parfait !") :
                    "Maintenez votre focus sur les points clأ©s."
                  ) : "Commencez l'exercice pour recevoir du feedback..."}
                </motion.p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!stream || !isAnalyzerReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-surface/80 backdrop-blur-sm z-20 pointer-events-none">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white/60 font-medium tracking-tight">Initialisation HoopVision AI...</p>
          </div>
        </div>
      )}

      {/* Premium HUD */}
      <div className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 flex flex-col items-center gap-3 pointer-events-none sm:bottom-5">
        <ScoreBoard madeCount={madeCount} missCount={missCount} />

        <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-3xl border border-white/10 bg-black/35 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:gap-3">
          <motion.button
            whileHover={{ scale: 1.06, y: -1 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onRecordingChange(!isRecording)}
            className={cn(
              "grid h-12 w-12 place-items-center rounded-2xl border shadow-xl backdrop-blur-xl transition sm:h-14 sm:w-14",
              isRecording
                ? "border-red-400/40 bg-red-500/85 text-white shadow-red-500/25"
                : "border-white/10 bg-white text-black shadow-white/10 hover:shadow-brand-neon/25"
            )}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            title={isRecording ? "Stop" : "Play"}
          >
            {isRecording ? <Square size={21} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </motion.button>

          <FullscreenButton active={Boolean(document.fullscreenElement) || isPseudoFullscreen} onClick={toggleFullscreen} />

          <motion.button
            whileHover={{ scale: 1.06, rotate: 22, y: -1 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowSettings((value) => !value)}
            className={cn(
              "grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/55 text-white shadow-xl shadow-black/30 backdrop-blur-xl transition hover:border-brand-orange/50 hover:bg-brand-orange/15 hover:text-brand-orange sm:h-14 sm:w-14",
              showSettings && "border-brand-orange/55 bg-brand-orange/15 text-brand-orange shadow-brand-orange/20"
            )}
            aria-label="Open settings"
            title="Settings"
          >
            <SettingsIcon size={21} />
          </motion.button>

          <ScanButton
            active={isScanning}
            onClick={() => {
              setIsScanning((value) => !value);
              if (!isScanning) {
                window.setTimeout(() => setIsScanning(false), 3200);
              }
            }}
          />

          <div className="flex items-center gap-2 border-l border-white/10 pl-2">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onMissedShot}
              className="min-h-12 rounded-2xl border border-red-400/20 bg-red-500/15 px-3 text-xs font-black uppercase tracking-widest text-red-200 shadow-lg shadow-red-500/10 transition hover:bg-red-500/25 sm:min-h-14 sm:px-4"
            >
              Miss
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onMadeShot}
              className="min-h-12 rounded-2xl border border-brand-neon/20 bg-brand-neon/15 px-3 text-xs font-black uppercase tracking-widest text-brand-neon shadow-lg shadow-brand-neon/10 transition hover:bg-brand-neon/25 sm:min-h-14 sm:px-4"
            >
              Made
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {isScanning && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-none rounded-full border border-brand-neon/20 bg-black/45 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-brand-neon backdrop-blur-xl"
            >
              Terrain scan active
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute right-4 top-4 z-30 hidden max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-2xl border border-white/10 bg-black/35 p-1 backdrop-blur-xl pointer-events-auto md:flex">
        {[
          { id: 'DRIBBLE', label: 'Dribble' },
          { id: 'JUMPSHOT', label: 'Tir' },
          { id: 'CROSSOVER', label: 'Cross' },
          { id: 'FADEAWAY', label: 'Fade' },
          { id: 'HESITATION', label: 'Hesi' },
          { id: 'EUROSTEP', label: 'Euro' },
          { id: 'PASS', label: 'Passe' },
          { id: 'REBOUND', label: 'Rebond' }
        ].map((move, mIdx) => (
          <button
            key={`${move.id}-${mIdx}`}
            onClick={() => setInternalSelectedMoves(prev =>
              prev.includes(move.id) ? prev.filter(id => id !== move.id) : [...prev, move.id]
            )}
            className={cn(
              "rounded-xl px-2.5 py-2 text-[10px] font-bold uppercase tracking-tighter transition-all whitespace-nowrap",
              selectedMoves.includes(move.id)
                ? "bg-brand-blue/85 text-white shadow-lg shadow-brand-blue/20"
                : "text-white/40 hover:bg-white/5 hover:text-white/70"
            )}
          >
            {move.label}
          </button>
        ))}
      </div>

      <div className="absolute top-4 right-4 flex flex-col items-end gap-3 z-50 pointer-events-auto">
        
        <AnimatePresence>
          {showSetupGuide && (
            <CourtSetupGuide 
              onComplete={() => setShowSetupGuide(false)} 
              courtType={courtType}
            />
          )}
          
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="glass-card max-h-[calc(100dvh-2rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto border-white/10 p-5 flex flex-col gap-5 shadow-2xl origin-top-right"
            >
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase mb-2 block">Camأ©ra</label>
              <CameraSelector
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onSelect={setSelectedDeviceId}
                onRefresh={() => refreshCameras().catch((error) => console.warn('Camera refresh failed:', error))}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase mb-2 block tracking-widest">AI Sensitivity</label>
              <input
                type="range"
                min={0.35}
                max={1}
                step={0.01}
                value={aiSensitivity}
                onChange={(event) => setAiSensitivity(Number(event.target.value))}
                className="w-full accent-brand-neon"
              />
              <div className="mt-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-white/35">
                <span>Stable</span>
                <span className="text-brand-neon">{Math.round(aiSensitivity * 100)}%</span>
                <span>Sharp</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-white/65 transition hover:border-brand-orange/40 hover:text-brand-orange"
              >
                Fullscreen
              </button>
              <button
                type="button"
                onClick={() => setAudioEnabled((value) => !value)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-widest transition",
                  audioEnabled
                    ? "border-brand-neon/30 bg-brand-neon/10 text-brand-neon"
                    : "border-white/10 bg-white/5 text-white/55"
                )}
              >
                {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} Audio
              </button>
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase mb-2 block">Perspective Terrain</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'front', label: 'Face' },
                  { id: 'side-left', label: 'Cأ´tأ© G' },
                  { id: 'side-right', label: 'Cأ´tأ© D' }
                ] as const).map(p => (
                  <button 
                    key={p.id}
                    onClick={() => {
                       if(analyzerRef.current) {
                          analyzerRef.current.perspective = p.id;
                          // Adjust hoop default position based on perspective
                          if (p.id === 'side-left') analyzerRef.current.hoopPos = { x: 0.1, y: 0.5 };
                          else if (p.id === 'side-right') analyzerRef.current.hoopPos = { x: 0.9, y: 0.5 };
                          else analyzerRef.current.hoopPos = { x: 0.5, y: 0.22 };
                          setRetryCount(c => c + 1); // Trigger re-render of settings
                       }
                    }}
                    className={cn(
                      "p-1.5 rounded-lg border text-[10px] font-bold transition-all",
                      analyzerRef.current?.perspective === p.id ? "bg-brand-blue border-brand-blue text-white" : "border-white/10 text-white/40 hover:bg-white/5"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase mb-2 block">Type de Terrain</label>
              <div className="grid grid-cols-3 gap-2">
                {(['5v5', '3v3', 'none'] as CourtType[]).map(t => (
                  <button 
                    key={t}
                    onClick={() => setCourtType(t)}
                    className={cn(
                      "p-1.5 rounded-lg border text-[10px] font-bold transition-all",
                      courtType === t ? "bg-brand-blue border-brand-blue text-white" : "border-white/10 text-white/40 hover:bg-white/5"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase mb-2 block">Calibration Terrain</label>
              <div className="space-y-3">
                <CalibrationSlider 
                  label="Panier (Y)" 
                  value={analyzerRef.current?.hoopPos.y || 0.22} 
                  onChange={(v) => { if(analyzerRef.current) analyzerRef.current.hoopPos.y = v; }} 
                />
                <CalibrationSlider 
                  label="Panier (X)" 
                  value={analyzerRef.current?.hoopPos.x || 0.5} 
                  onChange={(v) => { if(analyzerRef.current) analyzerRef.current.hoopPos.x = v; }} 
                />
                <CalibrationSlider 
                  label="Ligne 3PT" 
                  value={analyzerRef.current?.courtLines.threePtRadius || 0.45} 
                  min={0.1} max={0.8}
                  onChange={(v) => { if(analyzerRef.current) analyzerRef.current.courtLines.threePtRadius = v; }} 
                />
                <CalibrationSlider 
                  label="Zone restrictive" 
                  value={analyzerRef.current?.courtLines.keyWidth || 0.25} 
                  min={0.05} max={0.5}
                  onChange={(v) => { if(analyzerRef.current) analyzerRef.current.courtLines.keyWidth = v; }} 
                />
                <CalibrationSlider 
                  label="Ligne de Lancأ© Franc (Y)" 
                  value={analyzerRef.current?.courtLines.freeThrowLineY || 0.42} 
                  min={0.2} max={0.8}
                  onChange={(v) => { if(analyzerRef.current) analyzerRef.current.courtLines.freeThrowLineY = v; }} 
                />
                <CalibrationSlider 
                  label="Ligne de Fond (Y)" 
                  value={analyzerRef.current?.courtLines.baselineY || 0.15} 
                  min={0} max={0.5}
                  onChange={(v) => { if(analyzerRef.current) analyzerRef.current.courtLines.baselineY = v; }} 
                />
                <CalibrationSlider 
                  label="Lignes Latأ©rales (Padding)" 
                  value={analyzerRef.current?.courtLines.sidelinePadding || 0.05} 
                  min={0} max={0.2}
                  onChange={(v) => { if(analyzerRef.current) analyzerRef.current.courtLines.sidelinePadding = v; }} 
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase mb-2 block tracking-widest">Qualitأ© Vidأ©o</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {(['480p', '720p', '1080p'] as const).map(q => (
                  <motion.button 
                    key={q}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVideoQuality(q)}
                    className={cn(
                      "p-1.5 rounded-lg border text-[10px] font-bold transition-all",
                      videoQuality === q ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" : "border-white/10 text-white/40 hover:bg-white/5"
                    )}
                  >
                    {q}
                  </motion.button>
                ))}
              </div>
              <p className="text-[8px] text-white/30 italic leading-relaxed px-1">
                {videoQuality === '480p' && "Performance max, idأ©al pour vieux appareils."}
                {videoQuality === '720p' && "أ‰quilibre parfait entre clartأ© et fluiditأ© AI."}
                {videoQuality === '1080p' && "Dأ©tails max, nأ©cessite une connexion et un CPU forts."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

      {/* Real-time Telemetry Overlay */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 z-10 pointer-events-none">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="glass-card px-4 py-2 flex items-center gap-3 border-brand-neon/30 neon-green-shadow bg-brand-surface/40"
        >
          <div className="w-2 h-2 rounded-full bg-brand-neon animate-pulse"></div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-brand-neon font-bold">Scanning Surface</span>
        </motion.div>
        
        {metrics && (
          <div className="flex flex-col gap-2">
            <MetricTag label="MADE / MISSED" value={`${metrics.madeShots} / ${metrics.missedShots}`} active={metrics.madeShots > 0} delay={0.1} />
            <MetricTag label="DRIBBLES" value={`${metrics.dribbleCount}`} active={dribbleAge < 500} delay={0.15} />
            {dribbleStreak > 0 && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-3 py-1 bg-brand-neon text-black text-[10px] font-bold rounded-lg flex items-center justify-between shadow-lg neon-green-shadow"
              >
                <span>COMBO STREAK</span>
                <span className="text-sm">x{dribbleStreak}</span>
              </motion.div>
            )}
            <MetricTag label="POSSESSION" value={metrics.hasBall ? "OUI" : "NON"} active={metrics.hasBall} delay={0.2} />
            <AnimatePresence>
              {metrics.courtStatus.in3PtRange && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="px-3 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  3 POINTS
                </motion.div>
              )}
              {metrics.courtStatus.inPaint && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="px-3 py-1 bg-brand-blue text-white text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-brand-blue/20"
                >
                  ZONE PEINTE
                </motion.div>
              )}
              {metrics.ballDetected && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="px-3 py-1 bg-brand-blue text-white text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-brand-blue/20"
                >
                  <RefreshCw size={12} className="animate-spin" /> BALLON Dأ‰TECTأ‰
                </motion.div>
              )}
              {metrics.isShooting && (
                <motion.div 
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 5, opacity: 0 }}
                  className="px-3 py-1 bg-white text-black text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-xl"
                >
                  <Target size={12} className="animate-pulse" /> TIR EN COURS
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Technical Breakdown Overlay */}
        <AnimatePresence>
          {activeMove && (
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="mt-4 pointer-events-auto"
            >
              <div className="glass-card p-5 border-brand-blue/30 bg-black/80 backdrop-blur-2xl w-[240px] shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-brand-blue uppercase tracking-widest">{activeMove.name} ANALYSE</span>
                    <span className="text-[8px] text-white/30 font-mono">FRAME {Math.floor(activeMove.timestamp % 10000)}</span>
                  </div>
                  <div className="p-2 bg-brand-blue/10 rounded-lg">
                    <Activity size={14} className="text-brand-blue animate-pulse" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  {activeMove.name === 'DRIBBLE' ? (
                    <>
                      <div className="flex flex-col gap-1 pr-1">
                        <TechnicalMetric label="Puissance" value={`${activeMove.metrics.power}%`} color={activeMove.metrics.power > 75 ? "text-blue-500" : "text-brand-neon"} />
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${activeMove.metrics.power}%` }}
                             className={cn("h-full", activeMove.metrics.power > 75 ? "bg-brand-blue" : "bg-brand-neon")} 
                           />
                        </div>
                        <span className="text-[7px] text-white/30 italic">
                          {activeMove.metrics.power > 75 ? "INTENSITأ‰ MAX : Risque de perte de contrأ´le plus أ©levأ©." : "OPTIMAL : أ‰quilibre parfait entre vitesse et sأ©curitأ©."}
                        </span>
                      </div>
                      <TechnicalMetric label="Rythme" value={`${activeMove.metrics.rhythm} BPM`} />
                      <TechnicalMetric label="Contrأ´le" value="98%" color="text-brand-neon" />
                      <TechnicalMetric label="Dribble #" value={activeMove.metrics.count} />
                    </>
                  ) : activeMove.name === 'PASS' ? (
                    <>
                      <TechnicalMetric label="Vأ©locitأ© X" value={`${activeMove.metrics.vx} px/s`} />
                      <TechnicalMetric label="Prأ©cision" value="88%" color="text-brand-neon" />
                      <TechnicalMetric label="Type" value="Chest Pass" />
                    </>
                  ) : activeMove.name === 'REBOUND' ? (
                    <>
                      <TechnicalMetric label="Impact" value="أ‰LEVأ‰" color="text-brand-neon" />
                      <TechnicalMetric label="Timing" value="PARFAIT" />
                      <TechnicalMetric label="Position" value="Inner" />
                    </>
                  ) : activeMove.name === 'HESITATION' ? (
                    <>
                      <TechnicalMetric label="Dأ©calage" value="Dأ‰TECTأ‰" color="text-brand-neon" />
                      <TechnicalMetric label="Rhytme" value={`${activeMove.metrics.rhythm} BPM`} />
                      <TechnicalMetric label="Puissance" value={`${activeMove.metrics.power}%`} />
                    </>
                  ) : activeMove.name === 'EUROSTEP' ? (
                    <>
                      <TechnicalMetric label="Amplitude" value="LARGE" color="text-brand-neon" />
                      <TechnicalMetric label="Angle Genou" value={`${activeMove.metrics.knee}آ°`} />
                      <TechnicalMetric label="Stabilitأ©" value="EXCELLENTE" />
                    </>
                  ) : (
                    <>
                      <TechnicalMetric label="Angle Coude" value={`${activeMove.metrics.elbow}آ°`} />
                      <TechnicalMetric label="Angle Genou" value={`${activeMove.metrics.knee}آ°`} />
                      <TechnicalMetric label="Stabilitأ©" value="94%" color="text-brand-neon" />
                      <TechnicalMetric label="Puissance" value={activeMove.metrics.power ? `${activeMove.metrics.power}%` : "0.42s"} />
                    </>
                  )}
                </div>

                  <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-5 pt-3 border-t border-white/10"
                >
                  {activeMove.name === 'DRIBBLE' && dribbleHistory.length > 1 && (
                    <div className="mb-4">
                      <div className="text-[8px] text-white/30 uppercase mb-2 font-bold flex items-center gap-1">
                        <BarChart2 size={10} /> Signature de Dribble (Puissance vs Rythme)
                      </div>
                      <div className="h-[80px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                            <XAxis 
                              type="number" 
                              dataKey="rhythm" 
                              domain={[0, 300]} 
                              hide 
                            />
                            <YAxis 
                              type="number" 
                              dataKey="power" 
                              domain={[0, 100]} 
                              hide 
                            />
                            <Scatter name="Dribbles" data={dribbleHistory}>
                              {dribbleHistory.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={index === dribbleHistory.length - 1 ? "#00FF94" : "rgba(0, 255, 148, 0.3)"}
                                  stroke={index === dribbleHistory.length - 1 ? "#00FF94" : "rgba(0, 255, 148, 0.1)"}
                                />
                              ))}
                            </Scatter>
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 text-[8px] text-brand-blue/60 uppercase font-bold text-center tracking-tighter">
                    <span>FORME TECHNIQUE OPTIMALE</span>
                    <ChevronRight size={10} />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isRecording && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-red-500/90 backdrop-blur-md rounded-full shadow-lg shadow-red-500/20 z-10 pointer-events-none"
        >
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white">RECORDING</span>
        </motion.div>
      )}
    </div>
  );
}

function CourtSetupGuide({ onComplete, courtType }: { onComplete: () => void, courtType: CourtType }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-lg bg-brand-surface border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 relative bg-black/20">
          <div className="text-center px-8">
            <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">Installation HoopVision</h2>
            <p className="text-white/40 text-[10px] font-bold uppercase mt-1 tracking-widest">Calibration Recommandأ©e</p>
          </div>
          <button 
            onClick={onComplete}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full text-white/30 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

       <div className="relative flex-1 overflow-y-auto p-6 sm:p-10 space-y-8">
  
  {/* Button fermeture */}
  <button
  onClick={onComplete}
  className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500/80 transition-all duration-300 border border-white/10 backdrop-blur-md"
>
  âœ•
</button>

  <div className="text-center space-y-4">
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full">
      <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
      <span className="text-[10px] font-black text-brand-blue uppercase">
        Placement Optimal
      </span>
    </div>

    <p className="text-sm sm:text-base text-white/80 leading-relaxed font-medium italic">
      "Placez votre tأ©lأ©phone dans le{" "}
      <span className="text-brand-blue font-black uppercase">
        coin arriأ¨re
      </span>
      . L'angle doit couvrir{" "}
      <span className="underline decoration-brand-blue/40 underline-offset-4">
        le panier et la ligne أ  3 points
      </span>
      ."
    </p>
  </div>

  <div className="grid grid-cols-1 gap-6">
    <div className="relative rounded-3xl overflow-hidden border border-white/5 aspect-video bg-black/40">
      <img
        src="https://images.unsplash.com/photo-1544919982-b61976f0ba43?auto=format&fit=crop&q=80&w=800"
        alt="Guide"
        className="w-full h-full object-cover opacity-40 grayscale"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

      <div className="absolute top-4 left-4">
        <span className="text-[9px] font-black text-white/40 bg-black/40 px-2 py-1 rounded border border-white/5 uppercase tracking-widest">
          Exemple Rأ©el
        </span>
      </div>
    </div>

   {/* Show detailed court diagram only if technical tracking is active */}
{courtType !== "none" && (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
    <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-3 flex flex-col items-center gap-2 shadow-2xl">
      
      <div className="relative w-[120px] aspect-square flex flex-col justify-end p-2 border border-white/10 rounded-xl bg-black/60">
        
        {/* Court line */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[75%] h-[75%] border border-white/20 rounded-b-full border-t-0" />

        {/* Basket / hoop */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-5 h-1.5 bg-brand-blue/50 rounded-full" />

        {/* Camera tracker */}
        <motion.div
          animate={{ y: [0, -3, 0], scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-2 left-2 flex flex-col items-center"
        >
          <div className="w-8 h-5 bg-brand-blue rounded-md flex items-center justify-center shadow-lg border border-white/20">
            <Video size={10} className="text-white" />
          </div>
        </motion.div>

        {/* Label */}
        <div className="absolute bottom-2 right-2 text-[6px] font-black text-white/40 uppercase tracking-widest">
          Tracking
        </div>
      </div>

      <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest">
        Top View
      </p>
    </div>
  </div>
)}
  </div>
</div>

        <div className="p-8 bg-black/20 border-t border-white/5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onComplete}
            className="w-full py-4 bg-brand-blue text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-brand-blue/30 flex items-center justify-center gap-3"
          >
            Commencer l'analyse
            <ChevronRight size={18} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function CalibrationSlider({ label, value, onChange, min = 0, max = 1 }: { label: string, value: number, onChange: (v: number) => void, min?: number, max?: number }) {
  const [val, setVal] = useState(value);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-[8px] font-bold text-white/60">
        <span>{label}</span>
        <span>{Math.round(val * 100)}%</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step="0.01" 
        value={val} 
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setVal(v);
          onChange(v);
        }}
        className="w-full accent-brand-blue h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
      />
    </div>
  );
}

function TechnicalMetric({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-end border-b border-white/5 pb-2">
      <span className="text-[9px] text-white/40 uppercase font-medium">{label}</span>
      <span className={cn("text-xs font-mono font-bold italic", color)}>{value}</span>
    </div>
  );
}

function MetricTag({ label, value, active, delay = 0 }: { label: string; value: string; active?: boolean; delay?: number }) {
  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay }}
      className={cn(
        "glass-card px-3 py-2 flex justify-between items-center gap-6 border-white/5 bg-black/40 min-w-[150px] shadow-lg",
        active && "border-brand-neon/50 bg-brand-neon/5"
      )}
    >
      <span className="text-[9px] font-mono text-white/40 uppercase tracking-tighter">{label}</span>
      <span className={cn("text-xs font-mono font-bold", active ? "text-brand-neon" : "text-white")}>{value}</span>
    </motion.div>
  );
}

