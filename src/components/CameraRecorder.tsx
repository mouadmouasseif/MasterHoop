import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Square, Activity, Target, Settings as SettingsIcon, Video, RefreshCw, ChevronRight, BarChart2, X, ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/src/lib/utils';
import { PoseAnalyzer, PoseMetrics } from '@/src/lib/poseDetection';
import { Drill } from '@/src/components/DrillTutorials';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface CameraRecorderProps {
  isRecording: boolean;
  onRecordingChange: (recording: boolean) => void;
  onRecordingComplete: (blob: Blob) => void;
  onMetricsUpdate?: (metrics: PoseMetrics) => void;
  selectedMoves?: string[];
  currentDrill?: Drill | null;
  onClearDrill?: () => void;
}

type CourtType = '5v5' | '3v3' | 'none';

export function CameraRecorder({ 
  isRecording, 
  onRecordingChange, 
  onRecordingComplete,
  onMetricsUpdate,
  selectedMoves: externalSelectedMoves,
  currentDrill,
  onClearDrill
}: CameraRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<PoseAnalyzer | null>(null);
  const requestRef = useRef<number>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PoseMetrics | null>(null);
  const [isAnalyzerReady, setIsAnalyzerReady] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [courtType, setCourtType] = useState<CourtType>('3v3');
  const [videoQuality, setVideoQuality] = useState<'480p' | '720p' | '1080p'>('720p');
  const [showSettings, setShowSettings] = useState(false);
  const [activeMove, setActiveMove] = useState<{ name: string; metrics: any; timestamp: number } | null>(null);
  const [internalSelectedMoves, setInternalSelectedMoves] = useState<string[]>(['JUMPSHOT', 'CROSSOVER', 'FADEAWAY', 'DRIBBLE', 'PASS', 'REBOUND', 'HESITATION', 'EUROSTEP']);

  const selectedMoves = externalSelectedMoves || internalSelectedMoves;

  const [retryCount, setRetryCount] = useState(0);
  const [dribbleHistory, setDribbleHistory] = useState<{ power: number; rhythm: number; id: number }[]>([]);

  // Initialize Pose Analyzer
  useEffect(() => {
    const analyzer = new PoseAnalyzer();
    analyzer.initialize().then(() => {
      analyzerRef.current = analyzer;
      setIsAnalyzerReady(true);
    });
    
    // Get camera devices
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0) setSelectedDeviceId(videoDevices[0].deviceId);
    });

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

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
    async function setupCamera() {
      setError(null);
      try {
        const qualityConfig = {
          '480p': { width: 640, height: 480 },
          '720p': { width: 1280, height: 720 },
          '1080p': { width: 1920, height: 1080 }
        };
        const res = qualityConfig[videoQuality];
        
        const constraints = { 
          video: {
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            width: { ideal: res.width },
            height: { ideal: res.height }
          }, 
          audio: false 
        };
        
        const userStream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = userStream;
        setStream(userStream);
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      }
    }

    setupCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [retryCount, selectedDeviceId, videoQuality]);

  const drawCourtMiniMap = (ctx: CanvasRenderingContext2D, type: CourtType) => {
    if (type === 'none') return;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    
    // Mini-map dimensions (bottom center)
    const mapW = 120;
    const mapH = 80;
    const padding = 20;
    const startX = (w - mapW) / 2;
    const startY = h - mapH - padding;

    // Background for mini-map
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(startX - 10, startY - 10, mapW + 20, mapH + 20, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
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
    const threePtRadius = w * (analyzerRef.current?.courtLines.threePtRadius || 0.45);
    const keyWidth = w * (analyzerRef.current?.courtLines.keyWidth || 0.25);
    const perspective = analyzerRef.current?.perspective || 'front';
    const baselineY = h * (analyzerRef.current?.courtLines.baselineY || 0.15);
    const freeThrowLineY = h * (analyzerRef.current?.courtLines.freeThrowLineY || 0.42);
    const sidelinePadding = w * (analyzerRef.current?.courtLines.sidelinePadding || 0.05);

    ctx.save();
    
    // Draw 3-Point Line
    ctx.beginPath();
    if (perspective === 'front') {
      ctx.arc(hoopX, hoopY, threePtRadius, Math.PI, 0, true);
    } else if (perspective === 'side-left') {
      ctx.arc(hoopX, hoopY, threePtRadius, -Math.PI/2, Math.PI/2);
    } else if (perspective === 'side-right') {
      ctx.arc(hoopX, hoopY, threePtRadius, Math.PI/2, 1.5 * Math.PI);
    }
    
    ctx.strokeStyle = metrics?.courtStatus.in3PtRange ? 'rgba(0, 255, 148, 0.6)' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    ctx.stroke();

    // Draw The Key (Paint)
    ctx.beginPath();
    ctx.setLineDash([]);
    if (perspective === 'front') {
      // Main rectangle of the key
      ctx.roundRect(hoopX - keyWidth/2, baselineY, keyWidth, freeThrowLineY - baselineY, [0, 0, 5, 5]);
      // Free throw circle
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hoopX, freeThrowLineY, keyWidth/4, 0, Math.PI);
    } else if (perspective === 'side-left') {
      ctx.roundRect(sidelinePadding, hoopY - (h * 0.1), keyWidth, h * 0.2, 5);
    } else if (perspective === 'side-right') {
      ctx.roundRect(w - keyWidth - sidelinePadding, hoopY - (h * 0.1), keyWidth, h * 0.2, 5);
    }
    ctx.strokeStyle = metrics?.courtStatus.inPaint ? 'rgba(255, 107, 0, 0.6)' : 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    // Side and Baselines
    ctx.beginPath();
    ctx.rect(sidelinePadding, baselineY, w - 2 * sidelinePadding, h - baselineY - (h * 0.05));
    ctx.strokeStyle = metrics?.courtStatus.isOutOfBounds ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (metrics?.courtStatus.isOutOfBounds) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 32px Mono';
      ctx.textAlign = 'center';
      ctx.fillText('SORTIE !', w/2, h - 100);
    }
    
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

    // Define logical hoop position for visualization
    const hoopPos = { x: w * 0.5, y: h * 0.22 };

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

      ctx.beginPath();
      ctx.ellipse(hoopPos.x, hoopPos.y, 25, 10, 0, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 107, 0, 0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Hoop indicator
      ctx.fillStyle = 'rgba(255, 107, 0, 0.4)';
      ctx.font = 'bold 10px Mono';
      ctx.fillText('CIBLE PANIER', hoopPos.x - 30, hoopPos.y - 15);
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
      const powerLabel = power > 75 ? "EXPLOSIF" : power > 40 ? "FORT" : "CONTRÔLÉ";
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
        ctx.fillText('MOVE DÉTECTÉ', w / 2, bY + 12);
        
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
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      onRecordingComplete(blob);
      mediaRecorderRef.current = null;
    };
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
  };

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-brand-surface rounded-2xl border border-white/10 p-8 text-center">
        <Square className="w-12 h-12 mx-auto text-red-500 mb-4" strokeWidth={1.5} />
        <h3 className="text-xl font-bold mb-2">Accès Caméra</h3>
        <p className="text-white/40 mb-6 text-sm">{error}</p>
        <button onClick={() => setRetryCount(prev => prev + 1)} className="px-6 py-3 bg-brand-blue text-white rounded-xl font-bold">Réessayer</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden group">
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        className="w-full h-full object-cover mirror"
      />
      <canvas
        ref={canvasRef}
        width={videoQuality === '1080p' ? 1920 : videoQuality === '720p' ? 1280 : 640}
        height={videoQuality === '1080p' ? 1080 : videoQuality === '720p' ? 720 : 480}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      
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
                    (activeMove.metrics.power < 10 ? "Soyez plus explosif sur le dribble !" : "Crossover très bas et rapide, parfait !") :
                    "Maintenez votre focus sur les points clés."
                  ) : "Commencez l'exercice pour recevoir du feedback..."}
                </motion.p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!stream || !isAnalyzerReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-surface/80 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white/60 font-medium tracking-tight">Initialisation HoopVision AI...</p>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-3 z-30">
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
               setIsScanning(true);
               setTimeout(() => setIsScanning(false), 3000);
            }}
            className={cn(
              "p-3 rounded-xl shadow-xl border flex items-center gap-2 transition-all",
              isScanning ? "bg-white text-black animate-pulse" : "bg-brand-blue text-white border-brand-blue/30"
            )}
          >
             <Activity size={18} />
             <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">
               {isScanning ? "Scanning..." : "Scanner Terrain"}
             </span>
          </motion.button>

          {/* Move Filters */}
          <div className="hidden md:flex items-center gap-1.5 p-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 mr-2">
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
                  "px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-tighter whitespace-nowrap",
                  selectedMoves.includes(move.id) 
                    ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                    : "text-white/40 hover:text-white/60 hover:bg-white/5"
                )}
              >
                {move.label}
              </button>
            ))}
          </div>

          <motion.button 
            whileHover={{ scale: 1.05, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-black/60 transition-all shadow-xl"
          >
            <SettingsIcon size={20} />
          </motion.button>
        </div>
        
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
              className="glass-card p-5 min-w-[240px] border-white/10 flex flex-col gap-5 shadow-2xl origin-top-right"
            >
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase mb-2 block">Caméra</label>
              <select 
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none"
              >
                {devices.map((d, dIdx) => <option key={`${d.deviceId || 'cam'}-${dIdx}`} value={d.deviceId}>{d.label || `Camera ${dIdx + 1}`}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase mb-2 block">Perspective Terrain</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'front', label: 'Face' },
                  { id: 'side-left', label: 'Côté G' },
                  { id: 'side-right', label: 'Côté D' }
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
                  label="Ligne de Lancé Franc (Y)" 
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
                  label="Lignes Latérales (Padding)" 
                  value={analyzerRef.current?.courtLines.sidelinePadding || 0.05} 
                  min={0} max={0.2}
                  onChange={(v) => { if(analyzerRef.current) analyzerRef.current.courtLines.sidelinePadding = v; }} 
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase mb-2 block tracking-widest">Qualité Vidéo</label>
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
                {videoQuality === '480p' && "Performance max, idéal pour vieux appareils."}
                {videoQuality === '720p' && "Équilibre parfait entre clarté et fluidité AI."}
                {videoQuality === '1080p' && "Détails max, nécessite une connexion et un CPU forts."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

      {/* Real-time Telemetry Overlay */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 z-10">
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
                  <RefreshCw size={12} className="animate-spin" /> BALLON DÉTECTÉ
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
              className="mt-4"
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
                          {activeMove.metrics.power > 75 ? "INTENSITÉ MAX : Risque de perte de contrôle plus élevé." : "OPTIMAL : Équilibre parfait entre vitesse et sécurité."}
                        </span>
                      </div>
                      <TechnicalMetric label="Rythme" value={`${activeMove.metrics.rhythm} BPM`} />
                      <TechnicalMetric label="Contrôle" value="98%" color="text-brand-neon" />
                      <TechnicalMetric label="Dribble #" value={activeMove.metrics.count} />
                    </>
                  ) : activeMove.name === 'PASS' ? (
                    <>
                      <TechnicalMetric label="Vélocité X" value={`${activeMove.metrics.vx} px/s`} />
                      <TechnicalMetric label="Précision" value="88%" color="text-brand-neon" />
                      <TechnicalMetric label="Type" value="Chest Pass" />
                    </>
                  ) : activeMove.name === 'REBOUND' ? (
                    <>
                      <TechnicalMetric label="Impact" value="ÉLEVÉ" color="text-brand-neon" />
                      <TechnicalMetric label="Timing" value="PARFAIT" />
                      <TechnicalMetric label="Position" value="Inner" />
                    </>
                  ) : activeMove.name === 'HESITATION' ? (
                    <>
                      <TechnicalMetric label="Décalage" value="DÉTECTÉ" color="text-brand-neon" />
                      <TechnicalMetric label="Rhytme" value={`${activeMove.metrics.rhythm} BPM`} />
                      <TechnicalMetric label="Puissance" value={`${activeMove.metrics.power}%`} />
                    </>
                  ) : activeMove.name === 'EUROSTEP' ? (
                    <>
                      <TechnicalMetric label="Amplitude" value="LARGE" color="text-brand-neon" />
                      <TechnicalMetric label="Angle Genou" value={`${activeMove.metrics.knee}°`} />
                      <TechnicalMetric label="Stabilité" value="EXCELLENTE" />
                    </>
                  ) : (
                    <>
                      <TechnicalMetric label="Angle Coude" value={`${activeMove.metrics.elbow}°`} />
                      <TechnicalMetric label="Angle Genou" value={`${activeMove.metrics.knee}°`} />
                      <TechnicalMetric label="Stabilité" value="94%" color="text-brand-neon" />
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
          className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-red-500/90 backdrop-blur-md rounded-full shadow-lg shadow-red-500/20 z-10"
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
            <p className="text-white/40 text-[10px] font-bold uppercase mt-1 tracking-widest">Calibration Recommandée</p>
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
    onClick={() => setIsOpen(false)}
    className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500/80 transition-all duration-300 border border-white/10 backdrop-blur-md"
  >
    ✕
  </button>

  <div className="text-center space-y-4">
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full">
      <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
      <span className="text-[10px] font-black text-brand-blue uppercase">
        Placement Optimal
      </span>
    </div>

    <p className="text-sm sm:text-base text-white/80 leading-relaxed font-medium italic">
      "Placez votre téléphone dans le{" "}
      <span className="text-brand-blue font-black uppercase">
        coin arrière
      </span>
      . L'angle doit couvrir{" "}
      <span className="underline decoration-brand-blue/40 underline-offset-4">
        le panier et la ligne à 3 points
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
          Exemple Réel
        </span>
      </div>
    </div>

    {/* Show detailed court diagram only if technical tracking is active */}
    {courtType !== "none" && (
      <div className="bg-white/5 rounded-3xl border border-white/5 p-6 flex flex-col items-center gap-4">
        <div className="relative w-full max-w-[180px] aspect-square flex flex-col justify-end p-2 border-2 border-white/5 rounded-2xl bg-black/40">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[75%] h-[75%] border-2 border-white/10 rounded-b-full border-t-0" />

          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-2 bg-brand-blue/40 rounded-full" />

          <motion.div
            animate={{ y: [0, -4, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-2 left-2 flex flex-col items-center gap-1"
          >
            <div className="w-10 h-6 bg-brand-blue rounded-lg flex items-center justify-center shadow-xl shadow-brand-blue/40 border border-white/20">
              <Video size={12} className="text-white" />
            </div>
          </motion.div>

          <div className="absolute bottom-3 right-4 text-[8px] font-black text-white/20 uppercase tracking-widest">
            Zone Tracking
          </div>
        </div>

        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
          Vue top-down (45°)
        </p>
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

