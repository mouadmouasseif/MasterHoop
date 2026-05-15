import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  LayoutDashboard, 
  History, 
  Settings, 
  Activity, 
  Target, 
  Clock, 
  Map as MapIcon,
  Video,
  Play,
  Pause,
  Square,
  Maximize2,
  ChevronRight,
  TrendingUp,
  Brain,
  Award,
  Zap,
  BookOpen,

} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { cn } from '@/src/lib/utils';
import { getCoachFeedback, generatePostMatchAnalysis, getBasketballNews } from '@/src/services/geminiService';
import AnalysisView from '@/src/components/AnalysisView';
import { Newspaper, X } from 'lucide-react';

import { CameraRecorder } from '@/src/components/CameraRecorder';
import { PoseMetrics } from '@/src/lib/poseDetection';

import { auth, db, loginWithGoogle } from '@/src/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy,
  limit,
  updateDoc,
  increment
} from 'firebase/firestore';
import { useGoogleLogin } from "@react-oauth/google";

// --- Types ---
interface Shot {
  x: number;
  y: number;
  z: number;
  shotType: string;
  outcome: 'made' | 'missed';
}

interface Session {
  id: string;
  userId: string;
  timestamp: any;
  duration: string;
  videoUrl: string;
  accuracy: number;
  thumbnail: string;
  shots?: Shot[];
  madeShots?: number;
  missedShots?: number;
  dribbleCount?: number;
  avgPower?: number;
  notes?: string;
}

interface UserProfile {
  userId: string;
  name: string;
  age: number;
  height: number;
  weight: number;
  totalSessions: number;
  avgAccuracy: number;
  bestAccuracy: number;
  preferredShot: string;
}

// --- Mock Data ---
const PERFORMANCE_DATA = [
  { session: 'S1', time: '10:00', accuracy: 45, bpm: 110 },
  { session: 'S2', time: '10:05', accuracy: 52, bpm: 125 },
  { session: 'S3', time: '10:10', accuracy: 48, bpm: 140 },
  { session: 'S4', time: '10:15', accuracy: 65, bpm: 145 },
  { session: 'S5', time: '10:20', accuracy: 72, bpm: 155 },
  { session: 'S6', time: '10:25', accuracy: 68, bpm: 160 },
  { session: 'S7', time: '10:30', accuracy: 80, bpm: 165 },
];

const INITIAL_SHOT_CHART_DATA: Shot[] = [
  { x: 20, y: 30, z: 10, shotType: 'Jump Shot', outcome: 'made' },
  { x: 25, y: 45, z: 12, shotType: 'Layup', outcome: 'missed' },
  { x: 50, y: 60, z: 15, shotType: 'Three Pointer', outcome: 'made' },
  { x: 75, y: 35, z: 8, shotType: 'Free Throw', outcome: 'made' },
  { x: 30, y: 80, z: 20, shotType: 'Jump Shot', outcome: 'missed' },
  { x: 80, y: 15, z: 5, shotType: 'Layup', outcome: 'made' },
  { x: 45, y: 25, z: 10, shotType: 'Three Pointer', outcome: 'missed' },
  { x: 15, y: 70, z: 12, shotType: 'Jump Shot', outcome: 'made' },
];

const SHOT_TYPE_COLORS: Record<string, string> = {
  'Jump Shot': '#FF6B00',
  'Layup': '#00FF94',
  'Three Pointer': '#00E0FF',
  'Free Throw': '#FFD700'
};

import { DrillTutorials, Drill } from '@/src/components/DrillTutorials';

export default function App() {
   const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log("LOGIN SUCCESS:", tokenResponse);
    },
    onError: () => {
      console.log("LOGIN FAILED");
    },
  });
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'stats' | 'coach' | 'history' | 'drills'>('live');
  const [currentDrill, setCurrentDrill] = useState<Drill | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [shotTypeFilter, setShotTypeFilter] = useState<string>('all');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [coachTips, setCoachTips] = useState<string[]>([]);
  const [activeCoachTip, setActiveCoachTip] = useState<{ text: string, type: 'move' | 'generic' } | null>(null);
  const [loadingTips, setLoadingTips] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<PoseMetrics | null>(null);
  const [isImmersive, setIsImmersive] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [sessionToSave, setSessionToSave] = useState<{ blob: Blob; metrics: PoseMetrics } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [postMatchAnalysis, setPostMatchAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newsData, setNewsData] = useState<{ text: string, sources: any[] } | null>(null);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [trainingMode, setTrainingMode] = useState<'FREESTYLE' | 'TARGETED'>('FREESTYLE');
  const [targetedMoves, setTargetedMoves] = useState<string[]>(['JUMPSHOT']);
  
  const lastAIFeedbackTime = useRef<number>(0);
  const lastMoveTipTime = useRef<number>(0);

  // MetaMask Login
  const loginWithMetaMask = async () => {
    setErrorStatus(null);
    try {
      if (!(window as any).ethereum) {
        throw new Error("MetaMask n'est pas installé");
      }
      
      const { BrowserProvider } = await import('ethers');
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      if (address) {
        setWalletAddress(address);
        // Also ensure user can see live tab
        setActiveTab('live');
      }
    } catch (error: any) {
      console.error("MetaMask connection error:", error);
      // Ensure the exact error message reported by the user is handled
      setErrorStatus("Failed to connect to MetaMask");
    }
  };

  // Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        fetchProfile(firebaseUser.uid);
        fetchSessions(firebaseUser.uid);
      } else {
        setProfile(null);
        setSessions([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        setShowProfileModal(true);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchSessions = (uid: string) => {
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const sessionData: Session[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sessionData.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : new Date().toLocaleString()
        } as Session);
      });
      setSessions(sessionData);
    }, (error) => {
      console.error("Error fetching sessions:", error);
    });
  };

  const handleSaveProfile = async (formData: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const newProfile: UserProfile = {
        userId: user.uid,
        name: formData.name || user.displayName || 'Joueur Anonyme',
        age: Number(formData.age) || 0,
        height: Number(formData.height) || 0,
        weight: Number(formData.weight) || 0,
        totalSessions: profile ? profile.totalSessions : 0,
        avgAccuracy: profile ? profile.avgAccuracy : 0,
        bestAccuracy: profile ? profile.bestAccuracy : 0,
        preferredShot: profile ? profile.preferredShot : 'Jump Shot'
      };
      await setDoc(doc(db, 'users', user.uid), {
        ...newProfile,
        updatedAt: serverTimestamp()
      });
      setProfile(newProfile);
      setShowProfileModal(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handleRecordingComplete = async (blob: Blob) => {
    if (!user || !liveMetrics) return;
    setSessionToSave({ blob, metrics: { ...liveMetrics } });
    setShowSaveModal(true);
    setIsRecording(false);
  };

  const handleSaveSession = async (notes: string) => {
    if (!user || !sessionToSave) return;
    
    setIsSaving(true);
    const { blob, metrics } = sessionToSave;
    
    // In a real app, we would upload to Firebase Storage
    const url = URL.createObjectURL(blob);
    
    const accuracy = metrics.elbowAngle ? Math.min(100, metrics.elbowAngle) : 72;
    
    const sessionData = {
      userId: user.uid,
      timestamp: serverTimestamp(),
      duration: '0:45',
      videoUrl: url,
      accuracy,
      madeShots: metrics.madeShots || 0,
      missedShots: metrics.missedShots || 0,
      dribbleCount: metrics.dribbleCount || 0,
      avgPower: metrics.dribblePower || 0,
      shots: metrics.shots || [],
      notes: notes,
      thumbnail: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=400&auto=format&fit=crop'
    };

    try {
      const docRef = await addDoc(collection(db, 'sessions'), sessionData);
      
      // Update global user stats
      const userRef = doc(db, 'users', user.uid);
      const newTotal = (profile?.totalSessions || 0) + 1;
      const newAvgAcc = profile ? ((profile.avgAccuracy * profile.totalSessions) + accuracy) / newTotal : accuracy;
      
      await updateDoc(userRef, {
        totalSessions: increment(1),
        avgAccuracy: newAvgAcc,
        bestAccuracy: Math.max(profile?.bestAccuracy || 0, accuracy)
      });
      
      // Refresh local profile
      setProfile(prev => prev ? {
        ...prev,
        totalSessions: prev.totalSessions + 1,
        avgAccuracy: newAvgAcc,
        bestAccuracy: Math.max(prev.bestAccuracy, accuracy)
      } : null);

      setShowSaveModal(false);
      
      // Trigger AI Post-Match Analysis
      setIsAnalyzing(true);
      try {
        const analysis = await generatePostMatchAnalysis({
          duration: 45,
          moves: {
            shots: (metrics.madeShots || 0) + (metrics.missedShots || 0),
            made: metrics.madeShots || 0,
            dribbles: metrics.dribbleCount || 0
          },
          avgDribblePower: metrics.dribblePower || 0,
          avgDribbleRhythm: metrics.dribbleRhythm || 120,
          avgFormScore: accuracy
        });
        setPostMatchAnalysis(analysis);
      } catch (e) {
        console.error("AI Analysis failed:", e);
      } finally {
        setIsAnalyzing(false);
        setSessionToSave(null);
      }

    } catch (error) {
      console.error("Error saving session:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMetricsUpdate = (metrics: PoseMetrics) => {
    setLiveMetrics(metrics);
    
    // Targeted Move Tips
    const now = Date.now();
    if (now - lastMoveTipTime.current > 6000) { // Throttle move tips to every 6s
      if (metrics.isCrossover) {
        setActiveCoachTip({ 
          text: "Bas sur les appuis ! Garde le dribble sous le genou pour une explosion maximale après le crossover.",
          type: 'move'
        });
        lastMoveTipTime.current = now;
      } else if (metrics.isFadeaway) {
        setActiveCoachTip({ 
          text: "Extension complète ! Crée de l'espace avec tes jambes et garde le focus sur le cercle pendant le saut arrière.",
          type: 'move'
        });
        lastMoveTipTime.current = now;
      }
    }

    // Auto-trigger AI coaching every 15 seconds if in coach tab or recording
    if ((activeTab === 'coach' || isRecording) && now - lastAIFeedbackTime.current > 15000) {
      if (metrics.elbowAngle > 0) {
        lastAIFeedbackTime.current = now;
        fetchTips(metrics);
      }
    }
  };

  const toggleTargetedMove = (move: string) => {
    setTargetedMoves(prev => 
      prev.includes(move) ? (prev.length > 1 ? prev.filter(m => m !== move) : prev) : [...prev, move]
    );
  };

  useEffect(() => {
    if (activeCoachTip) {
      const timer = setTimeout(() => {
        setActiveCoachTip(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeCoachTip]);

  const fetchTips = async (metrics?: PoseMetrics) => {
    setLoadingTips(true);
    const m = metrics || liveMetrics || {
      elbowAngle: 90,
      kneeAngle: 120,
      isShooting: false,
      isDribbling: false,
      shoulderLevel: 0
    };

    const feedback = await getCoachFeedback({
      accuracy: 72,
      elbowAngle: m.elbowAngle,
      releaseTime: 0.85,
      footPlacement: m.kneeAngle < 100 ? 'Bas' : 'Elevé',
      fatigueLevel: 25
    }, trainingMode === 'TARGETED' ? targetedMoves : []);
    setCoachTips(feedback.tips);
    setLoadingTips(false);
  };

  useEffect(() => {
    if (activeTab === 'coach' && coachTips.length === 0) {
      fetchTips();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col md:flex-row overflow-hidden h-screen">
      {/* Sidebar Navigation */}
      <nav className={cn(
        "w-full md:w-20 bg-brand-surface border-b md:border-b-0 md:border-r border-white/5 flex flex-row md:flex-col items-center py-4 md:py-8 sticky top-0 z-50 transition-all duration-500",
        isImmersive && activeTab === 'live' && "md:w-0 md:opacity-0 -translate-x-full md:pointer-events-none"
      )}>
        <div className="hidden md:flex mb-12">
          <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center shadow-lg shadow-brand-orange/40">
            <Target className="text-white w-6 h-6" />
          </div>
        </div>
        
        <div className="flex flex-row md:flex-col gap-6 px-4 md:px-0 w-full justify-around md:justify-start">
          <NavButton 
            active={activeTab === 'live'} 
            onClick={() => setActiveTab('live')} 
            icon={<Camera />} 
            label="Live" 
          />
          <NavButton 
            active={activeTab === 'drills'} 
            onClick={() => setActiveTab('drills')} 
            icon={<BookOpen />} 
            label="Drills" 
          />
          <NavButton 
            active={activeTab === 'stats'} 
            onClick={() => setActiveTab('stats')} 
            icon={<LayoutDashboard />} 
            label="Stats" 
          />
          <NavButton 
            active={activeTab === 'coach'} 
            onClick={() => setActiveTab('coach')} 
            icon={<Brain />} 
            label="Coach AI" 
          />
          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<History />} 
            label="History" 
          />
        </div>

        <div className="mt-auto hidden md:flex pb-4">
          <NavButton active={false} icon={<Settings />} label="Settings" />
        </div>
      </nav>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-y-auto p-4 md:p-8 transition-all duration-500",
        isImmersive && activeTab === 'live' && "p-0"
      )}>
        <header className={cn(
          "flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 transition-all duration-500",
          isImmersive && activeTab === 'live' && "opacity-0 h-0 mb-0 overflow-hidden"
        )}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Master Hoop - by Mouad Mouasseif</h1>
            <p className="text-white/40 text-sm mt-1">Analyse de performance basketball en temps réel</p>
          </div>
          <div className="flex items-center gap-3">
            {!user && !walletAddress ? (
              <div className="flex gap-2">
                 <button
      onClick={() => loginWithGoogle()}
      className="px-5 py-2.5 bg-brand-orange text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-brand-orange/20"
    >
      Login
    </button>
                <button 
                  onClick={loginWithMetaMask}
                  className="px-3 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
                  title="Connect MetaMask"
                >
                  <Activity size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold text-white">
                    {walletAddress 
                      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` 
                      : (profile?.name || user?.displayName)}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase font-mono">{profile?.totalSessions || 0} Sessions</div>
                </div>
                <button 
                  onClick={() => setShowProfileModal(true)}
                  className="w-10 h-10 rounded-xl border-2 border-brand-orange/40 overflow-hidden hover:scale-105 transition-all"
                >
                  <img 
                    src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || walletAddress}`} 
                    alt="avatar" 
                  />
                </button>
                <button 
                  onClick={() => {
                    if (user) signOut(auth);
                    if (walletAddress) setWalletAddress(null);
                  }}
                  className="p-2 text-white/40 hover:text-red-400 transition-colors"
                  title="Déconnexion"
                >
                  <Square size={16} fill="currentColor" />
                </button>
              </div>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'live' && (
              <motion.div 
                key="live"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                  "grid grid-cols-1 lg:grid-cols-3 gap-6 h-full",
                  isImmersive && "lg:grid-cols-1 gap-0"
                )}
              >
                {/* Main Camera View */}
                <div className={cn(
                  "lg:col-span-2 space-y-6 h-full",
                  isImmersive && "lg:col-span-1 space-y-0"
                )}>
                  <div className={cn(
                    "relative aspect-video glass-card overflow-hidden group transition-all duration-500",
                    isImmersive ? "aspect-auto h-full w-full rounded-none border-0" : "aspect-video"
                  )}>
                    <CameraRecorder 
                      isRecording={isRecording} 
                      onRecordingChange={setIsRecording}
                      onRecordingComplete={handleRecordingComplete}
                      onMetricsUpdate={handleMetricsUpdate}
                      selectedMoves={trainingMode === 'TARGETED' ? targetedMoves : undefined}
                      currentDrill={currentDrill}
                      onClearDrill={() => setCurrentDrill(null)}
                    />

                    {/* Training Mode Controller */}
                    <div className="absolute top-6 left-6 z-40 flex flex-col gap-3">
                      <div className="flex bg-black/60 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-2xl">
                        <button 
                          onClick={() => setTrainingMode('FREESTYLE')}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                            trainingMode === 'FREESTYLE' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
                          )}
                        >
                          Libre
                        </button>
                        <button 
                          onClick={() => setTrainingMode('TARGETED')}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                            trainingMode === 'TARGETED' ? "bg-brand-orange text-white shadow-lg shadow-brand-orange/40" : "text-white/40 hover:text-white"
                          )}
                        >
                          Ciblé
                        </button>
                      </div>

                      <AnimatePresence>
                        {trainingMode === 'TARGETED' && (
                          <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="glass-card p-3 bg-black/40 border-brand-orange/20 max-w-[200px]"
                          >
                            <div className="text-[8px] font-bold text-brand-orange uppercase mb-2 ml-1">Objectifs</div>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { id: 'JUMPSHOT', label: 'Tir' },
                                { id: 'CROSSOVER', label: 'Cross' },
                                { id: 'EUROSTEP', label: 'Euro' },
                                { id: 'FADEAWAY', label: 'Fade' },
                                { id: 'DRIBBLE', label: 'Dribble' }
                              ].map(move => (
                                <button
                                  key={move.id}
                                  onClick={() => toggleTargetedMove(move.id)}
                                  className={cn(
                                    "px-2 py-1 rounded-lg text-[9px] font-bold transition-all border",
                                    targetedMoves.includes(move.id) 
                                      ? "bg-brand-orange/20 border-brand-orange text-brand-orange" 
                                      : "bg-white/5 border-transparent text-white/40"
                                  )}
                                >
                                  {move.label}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* News Notification */}
                    <AnimatePresence>
                      {newsData && (
                        <motion.div 
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="absolute top-6 right-6 z-50 w-80 glass-card bg-brand-surface/95 border-brand-orange/30 shadow-2xl p-5"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Newspaper className="text-brand-orange" size={16} />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Actualités Flash</span>
                            </div>
                            <button onClick={() => setNewsData(null)} className="text-white/40 hover:text-white">
                              <X size={14} />
                            </button>
                          </div>
                          
                          <div className="max-h-60 overflow-y-auto no-scrollbar space-y-4">
                            <div className="text-xs text-white/80 leading-relaxed markdown-body">
                              {newsData.text}
                            </div>
                            
                            {newsData.sources.length > 0 && (
                              <div className="pt-3 border-t border-white/5">
                                <div className="text-[8px] font-bold text-white/30 uppercase mb-2">Sources</div>
                                <div className="flex flex-wrap gap-2">
                                  {newsData.sources.slice(0, 3).map((source, i) => (
                                    <a 
                                      key={`source-${i}-${source.url || i}`} 
                                      href={source.url} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-[9px] text-brand-orange hover:underline truncate max-w-full"
                                    >
                                      {source.title || "Lien"}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Coach AI Overlay Tip */}
                    <AnimatePresence>
                      {activeCoachTip && (
                        <motion.div 
                          initial={{ opacity: 0, y: 50, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.95 }}
                          className="absolute bottom-10 left-10 right-10 z-50 pointer-events-none flex justify-center"
                        >
                          <div className="glass-card p-6 bg-brand-surface/90 backdrop-blur-2xl border-brand-orange/40 shadow-[0_0_40px_rgba(255,107,0,0.2)] max-w-lg flex items-center gap-5 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-brand-orange"></div>
                            <div className="w-12 h-12 rounded-full bg-brand-orange/20 flex items-center justify-center shrink-0">
                               <Brain className="text-brand-orange w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-brand-orange uppercase tracking-wider mb-1">Coach AI Insight</div>
                              <p className="text-sm font-medium leading-relaxed text-white">{activeCoachTip.text}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* UI Controls */}
                    <div className={cn(
                      "absolute bottom-6 left-6 flex items-center gap-4 px-5 py-2.5 bg-black/40 backdrop-blur-3xl rounded-2xl border border-white/10 z-40 transition-all shadow-2xl",
                      isImmersive && "bottom-10 scale-110 px-6 py-3"
                    )}>
                      <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                        <div className={cn("w-2 h-2 rounded-full", isRecording ? "bg-red-500 animate-pulse" : "bg-white/20")}></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                          {isRecording ? "Enregistrement" : "Prêt"}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setIsRecording(!isRecording)}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg",
                            isRecording ? "bg-red-500 text-white hover:bg-red-600 scale-110" : "bg-white text-black hover:scale-105 active:scale-95"
                          )}
                        >
                          {isRecording ? <Square fill="currentColor" size={16} /> : <Play className="ml-0.5" fill="currentColor" size={18} />}
                        </button>
                        
                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                        
                        <button 
                          onClick={() => setIsImmersive(!isImmersive)}
                          className={cn(
                            "p-2.5 rounded-xl transition-all",
                            isImmersive ? "bg-brand-neon/20 text-brand-neon" : "text-white/40 hover:text-white hover:bg-white/5"
                          )}
                          title={isImmersive ? "Quitter Plein Écran" : "Plein Écran"}
                        >
                          <Maximize2 size={18} />
                        </button>

                        <button 
                          onClick={async () => {
                            setIsFetchingNews(true);
                            const news = await getBasketballNews();
                            setNewsData(news);
                            setIsFetchingNews(false);
                          }}
                          disabled={isFetchingNews}
                          className={cn(
                            "p-2.5 rounded-xl transition-all",
                            isFetchingNews ? "animate-pulse bg-brand-orange/20 text-brand-orange" : "text-white/40 hover:text-white hover:bg-brand-orange/10"
                          )}
                          title="Actualités Basket"
                        >
                          <Newspaper size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="absolute top-2 left-6 z-10 opacity-40 group-hover:opacity-100 transition-opacity">
                      <span className="px-3 py-1 bg-black/40 backdrop-blur-sm text-white/80 text-[9px] font-bold rounded-full uppercase tracking-widest flex items-center gap-1 border border-white/5">
                        <Clock size={10} /> 10:46:12
                      </span>
                    </div>

                    {isImmersive && (
                       <div className="absolute top-6 right-24 flex flex-col gap-4 z-20 animate-in fade-in slide-in-from-right-4">
                          <div className="glass-card p-4 bg-black/40 border-white/10 space-y-4 min-w-[180px]">
                            <AnalysisRow label="Made / Missed" value={liveMetrics ? `${liveMetrics.madeShots} / ${liveMetrics.missedShots}` : "0 / 0"} status={liveMetrics && liveMetrics.madeShots > 0 ? "Scoring" : "Tracking"} />
                            <AnalysisRow label="Move" value={liveMetrics?.isFadeaway ? "FADEAWAY" : liveMetrics?.isCrossover ? "CROSSOVER" : "R.A.S"} status={liveMetrics?.isFadeaway || liveMetrics?.isCrossover ? "DÉTECTÉ" : "SCAN"} active={liveMetrics?.isFadeaway || liveMetrics?.isCrossover} />
                            <AnalysisRow label="Précision" value={liveMetrics ? `${liveMetrics.elbowAngle}%` : "72%"} status="Live" />
                          </div>
                       </div>
                    )}
                  </div>
  
                  {!isImmersive && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard icon={<Activity />} value={isRecording ? `${liveMetrics?.elbowAngle || 0}%` : "72%"} label="Accuracy" />
                      <StatCard icon={<Target />} value={isRecording ? "12" : "24"} label="Shot Count" color="text-brand-orange" />
                      <StatCard icon={<Zap className="text-yellow-400" />} value="840" label="Kcal" />
                      <StatCard icon={<Clock />} value="42:12" label="Duration" />
                    </div>
                  )}
                </div>
  
                {/* Sidebar Stats */}
                {!isImmersive && (
                  <div className="space-y-6">
                    <div className="glass-card p-6 min-h-[300px]">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold">Analyse en cours</h3>
                        <TrendingUp className="text-brand-neon w-4 h-4" />
                      </div>
                      
                      <div className="space-y-5">
                        <AnalysisRow label="Made / Missed" value={liveMetrics ? `${liveMetrics.madeShots} / ${liveMetrics.missedShots}` : "0 / 0"} status={liveMetrics && liveMetrics.madeShots > 0 ? "Scoring" : "Tracking"} />
                        <AnalysisRow label="Move Spécial" value={liveMetrics?.isFadeaway ? "FADEAWAY" : liveMetrics?.isCrossover ? "CROSSOVER" : liveMetrics?.isShooting ? "JUMPSHOT" : liveMetrics?.isDribbling ? "DRIBBLE" : "AUCUN"} status={liveMetrics?.isFadeaway || liveMetrics?.isCrossover || (liveMetrics?.isDribbling && liveMetrics.dribblePower > 80) ? "DÉTECTÉ" : "SCANNING"} active={liveMetrics?.isFadeaway || liveMetrics?.isCrossover || (liveMetrics?.isDribbling && liveMetrics.dribblePower > 80)} />
                        <AnalysisRow label="Geste détecté" value={liveMetrics?.isShooting ? "TIR" : liveMetrics?.isDribbling ? "DRIBBLE" : "ATTENTE"} status={liveMetrics?.isDribbling ? `${liveMetrics.dribblePower}% Puissance` : liveMetrics?.hasBall ? "Balle en main" : "Sans balle"} />
                        <AnalysisRow label="Ballon" value={liveMetrics?.ballDetected ? "DÉTECTÉ" : "RECHERCHE..."} status="Radar" warning={!liveMetrics?.ballDetected} />
                      </div>
  
                      <div className="mt-8 pt-6 border-t border-white/5">
                        <button 
                          onClick={() => setActiveTab('coach')}
                          className="w-full py-4 bg-brand-orange rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all neon-orange-shadow"
                        >
                          Voir Conseils Coach <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
  
                    <div className="glass-card p-6 overflow-hidden">
                      <h3 className="font-bold mb-4">Rythme Cardiaque</h3>
                      <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={PERFORMANCE_DATA}>
                            <defs>
                              <linearGradient id="colorBpm" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00FF94" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#00FF94" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="time" type="category" hide />
                            <YAxis hide domain={[0, 200]} />
                            <Area type="monotone" dataKey="bpm" stroke="#00FF94" fillOpacity={1} fill="url(#colorBpm)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
          )}

          {activeTab === 'drills' && (
            <motion.div
              key="drills"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DrillTutorials onStartDrill={(drill) => {
                setCurrentDrill(drill);
                setActiveTab('live');
                setTrainingMode('TARGETED');
                // Auto-select moves based on drill if applicable
                if (drill.id === 'shot-mechanics') setTargetedMoves(['JUMPSHOT']);
                if (drill.id === 'crossover-speed') setTargetedMoves(['CROSSOVER']);
              }} />
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {(() => {
                // Get shots from all sessions that match the date filter
                const filteredSessions = sessions.filter(s => {
                  if (dateFilter === 'all') return true;
                  const sd = new Date(s.timestamp);
                  const now = new Date();
                  if (dateFilter === 'today') return sd.toDateString() === now.toDateString();
                  if (dateFilter === 'week') return sd >= new Date(now.setDate(now.getDate() - 7));
                  return true;
                });

                const currentShots = filteredSessions.flatMap(s => s.shots || []);
                const made = filteredSessions.reduce((acc, s) => acc + (s.madeShots || 0), 0);
                const totalMissed = filteredSessions.reduce((acc, s) => acc + (s.missedShots || 0), 0);
                const total = made + totalMissed || 1;
                const accuracy = Math.round((made / total) * 100);

                // Stats comparison with last session (sessions[1])
                const lastSession = sessions[1];
                const accuracyDelta = lastSession ? accuracy - lastSession.accuracy : 0;
                const profileDelta = profile ? accuracy - profile.avgAccuracy : 0;

                // Prepare progression data from last 10 real sessions
                const sessionProgressionData = [...sessions]
                  .sort((a, b) => {
                    const timeA = a.timestamp?.seconds || (typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : 0);
                    const timeB = b.timestamp?.seconds || (typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : 0);
                    return timeA - timeB;
                  })
                  .slice(-10)
                  .map((s, idx) => ({
                    session: `S${idx + 1}`,
                    accuracy: s.accuracy,
                    date: s.timestamp?.seconds 
                      ? new Date(s.timestamp.seconds * 1000).toLocaleDateString() 
                      : (typeof s.timestamp === 'string' ? new Date(s.timestamp).toLocaleDateString() : 'N/A'),
                    time: '',
                    bpm: 0
                  }));

                return (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard 
                        icon={<Target />} 
                        value={`${made}`} 
                        label="Paniers Réussis" 
                        color="text-brand-neon"
                        trend={lastSession ? `+${made - (lastSession.madeShots || 0)}` : undefined}
                      />
                      <StatCard 
                        icon={<Activity />} 
                        value={`${totalMissed}`} 
                        label="Paniers Manqués" 
                        color="text-red-400" 
                      />
                      <StatCard 
                        icon={<Zap className="text-yellow-400" />} 
                        value={`${accuracy}%`} 
                        label="Précision Moy." 
                        trend={accuracyDelta !== 0 ? `${accuracyDelta > 0 ? '+' : ''}${accuracyDelta}% vs Précédent` : undefined}
                      />
                      <StatCard 
                        icon={<Award className="text-brand-orange" />} 
                        value={`${profileDelta > 0 ? '+' : ''}${profileDelta}%`} 
                        label="vs Profil Joueur" 
                        color={profileDelta >= 0 ? "text-brand-neon" : "text-red-400"}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="glass-card p-8">
                        <div className="flex justify-between items-start mb-6">
                          <h3 className="text-xl font-bold flex items-center gap-2">
                            <Target className="text-brand-orange" /> Shot Heatmap
                          </h3>
                          <div className="flex flex-wrap gap-3 justify-end max-w-[200px]">
                            {Object.entries(SHOT_TYPE_COLORS).map(([type, color]) => (
                              <div key={type} className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>
                                <span className="text-[8px] text-white/50 uppercase font-mono">{type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="aspect-square bg-brand-dark/50 rounded-xl relative overflow-hidden border border-white/5 border-dashed">
                          {/* Basket Court Background Mock */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                            <div className="w-[80%] h-[80%] border-2 border-white rounded-full"></div>
                            <div className="absolute top-0 w-32 h-16 border-2 border-white border-t-0 rounded-b-3xl"></div>
                            <div className="absolute top-0 w-full h-[15%] border-b-2 border-white/20"></div>
                          </div>
                          
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                              <XAxis type="number" dataKey="x" name="x" hide domain={[0, 100]} />
                              <YAxis type="number" dataKey="y" name="y" hide domain={[0, 100]} />
                              <ZAxis type="number" dataKey="z" range={[100, 500]} />
                              <Tooltip 
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="glass-card p-3 border-white/10 text-xs shadow-2xl">
                                        <div className="font-bold text-white mb-1">{data.shotType}</div>
                                        <div className={cn(
                                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase inline-block",
                                          data.outcome === 'made' ? 'bg-brand-neon/20 text-brand-neon' : 'bg-red-500/20 text-red-400'
                                        )}>
                                          {data.outcome === 'made' ? 'Réussi' : 'Manqué'}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              {Object.keys(SHOT_TYPE_COLORS).map((type, tIdx) => {
                                const typeData = currentShots.filter(d => d.shotType === type);
                                if (typeData.length === 0) return null;
                                return (
                                  <Scatter 
                                    key={`scatter-${type}-${tIdx}`}
                                    name={type} 
                                    data={typeData} 
                                    fill={SHOT_TYPE_COLORS[type]}
                                    shape={(props: any) => {
                                      const {cx, cy, fill, payload, xAxis, yAxis} = props;
                                      if (!xAxis || !yAxis || typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
                                      
                                      try {
                                        const size = (payload.z || 0) / 1.5;
                                        const hoopX = typeof xAxis.scale === 'function' ? xAxis.scale(50) : cx;
                                        const hoopY = typeof yAxis.scale === 'function' ? yAxis.scale(100) : cy;
                                        
                                        if (isNaN(hoopX) || isNaN(hoopY)) return null;
                                        
                                        return (
                                          <g>
                                            <path 
                                              d={`M ${cx} ${cy} Q ${(cx + hoopX) / 2 + (cx > hoopX ? 10 : -10)} ${(cy + hoopY) / 2 - 20} ${hoopX} ${hoopY}`}
                                              fill="none"
                                              stroke="rgba(255, 255, 255, 0.1)" 
                                              strokeWidth="1" 
                                              strokeDasharray="4 4"
                                              className="pointer-events-none"
                                            />
                                            <circle 
                                              cx={cx} 
                                              cy={cy} 
                                              r={size} 
                                              fill={payload.outcome === 'made' ? fill : 'transparent'} 
                                              fillOpacity={0.7}
                                              stroke={fill}
                                              strokeWidth={2}
                                              className="transition-all duration-300 hover:scale-125"
                                            />
                                            {payload.outcome === 'missed' && (
                                              <line x1={cx - size/2} y1={cy - size/2} x2={cx + size/2} y2={cy + size/2} stroke={fill} strokeWidth={1} />
                                            )}
                                          </g>
                                        );
                                      } catch (e) {
                                        return <circle cx={cx} cy={cy} r={5} fill={fill} />;
                                      }
                                    }}
                                  />
                                );
                              })}
                            </ScatterChart>
                          </ResponsiveContainer>

                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-6 text-[9px] font-mono uppercase bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-white/40"></div> 
                              <span>Cercle Plein = Réussi</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full border border-white/40"></div> 
                              <span>Cercle Vide = Raté</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="glass-card p-8">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                          <TrendingUp className="text-brand-neon" /> Evolution Précision
                        </h3>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sessionProgressionData.length > 0 ? sessionProgressionData : PERFORMANCE_DATA}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                              <XAxis dataKey="session" type="category" stroke="#ffffff40" fontSize={10} />
                              <YAxis stroke="#ffffff40" fontSize={10} domain={[0, 100]} />
                              <Tooltip 
                                 contentStyle={{ backgroundColor: '#161617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                 labelStyle={{ color: '#fff' }}
                                 formatter={(value: any) => [`${value}%`, 'Précision']}
                                 labelFormatter={(label) => {
                                   const data = sessionProgressionData.find(d => d.session === label);
                                   return data ? `${label} (${data.date})` : label;
                                 }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="accuracy" 
                                stroke="#FF6B00" 
                                strokeWidth={3} 
                                dot={{ r: 4, fill: '#FF6B00', strokeWidth: 0 }} 
                                activeDot={{ r: 8, stroke: '#FF6B00', strokeWidth: 2, fill: '#161617' }} 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          {activeTab === 'coach' && (
            <motion.div 
              key="coach"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto"
            >
              <div className="glass-card p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Brain size={180} />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-16 h-16 bg-brand-orange/20 rounded-2xl flex items-center justify-center">
                       <Brain className="text-brand-orange w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-bold italic serif">Coach IA Analyse</h2>
                      <p className="text-white/40">Basé sur 1,240 tirs analysés ce mois-ci</p>
                    </div>
                  </div>

                  {loadingTips ? (
                    <div className="space-y-4 py-8">
                      <div className="h-12 bg-white/5 rounded-xl animate-pulse"></div>
                      <div className="h-12 bg-white/5 rounded-xl animate-pulse w-3/4"></div>
                      <div className="h-12 bg-white/5 rounded-xl animate-pulse w-1/2"></div>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {coachTips.map((tip, idx) => (
                        <motion.div 
                          key={`coach-tip-${idx}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.2 }}
                          className="p-6 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-4 group hover:bg-white/10 transition-all cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full bg-brand-neon/20 flex items-center justify-center shrink-0 mt-1">
                             <span className="text-brand-neon font-bold">{idx + 1}</span>
                          </div>
                          <p className="text-lg text-white/80 leading-relaxed font-light">{tip}</p>
                        </motion.div>
                      ))}
                      
                      <button 
                         onClick={fetchTips}
                         className="mt-8 text-brand-neon flex items-center gap-2 hover:gap-3 transition-all"
                      >
                         Recalculer les insights <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="glass-card p-6 flex items-center gap-6">
                    <div className="p-4 bg-blue-500/20 rounded-full text-blue-400">
                       <History size={24} />
                    </div>
                    <div>
                       <h4 className="font-bold">Routine d'étirement</h4>
                       <p className="text-sm text-white/40">Prévue après cette session</p>
                    </div>
                 </div>
                 <div className="glass-card p-6 flex items-center gap-6">
                    <div className="p-4 bg-purple-500/20 rounded-full text-purple-400">
                       <Video size={24} />
                    </div>
                    <div>
                       <h4 className="font-bold">Archive Vidéo</h4>
                       <p className="text-sm text-white/40">4 sessions prêtes pour revue</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h2 className="text-2xl font-bold italic serif">Historique des sessions</h2>
                
                <div className="flex flex-wrap items-center gap-4">
                  {/* Date Filters */}
                  <div className="flex bg-brand-surface p-1 rounded-xl border border-white/5">
                    <FilterButton active={dateFilter === 'all'} onClick={() => setDateFilter('all')} label="Tout" />
                    <FilterButton active={dateFilter === 'today'} onClick={() => setDateFilter('today')} label="Aujourd'hui" />
                    <FilterButton active={dateFilter === 'week'} onClick={() => setDateFilter('week')} label="Semaine" />
                    <FilterButton active={dateFilter === 'month'} onClick={() => setDateFilter('month')} label="Mois" />
                  </div>

                  {/* Shot Type Filters */}
                  <div className="flex bg-brand-surface p-1 rounded-xl border border-white/5 overflow-x-auto max-w-full no-scrollbar">
                    <FilterButton active={shotTypeFilter === 'all'} onClick={() => setShotTypeFilter('all')} label="Tous" />
                    <FilterButton active={shotTypeFilter === 'Jump Shot'} onClick={() => setShotTypeFilter('Jump Shot')} label="Jump" />
                    <FilterButton active={shotTypeFilter === 'Layup'} onClick={() => setShotTypeFilter('Layup')} label="Layup" />
                    <FilterButton active={shotTypeFilter === 'Three Pointer'} onClick={() => setShotTypeFilter('Three Pointer')} label="3Pt" />
                    <FilterButton active={shotTypeFilter === 'Free Throw'} onClick={() => setShotTypeFilter('Free Throw')} label="LF" />
                  </div>
                </div>

                <div className="px-4 py-2 bg-brand-surface border border-white/5 rounded-lg text-sm text-white/60">
                   {sessions.length} sessions
                </div>
              </div>

              {(() => {
                const filtered = sessions.filter(session => {
                  // Date Filter
                  let passDate = true;
                  if (dateFilter !== 'all') {
                    const sessionDate = new Date(session.timestamp);
                    const now = new Date();
                    
                    if (dateFilter === 'today') {
                      passDate = sessionDate.toDateString() === now.toDateString();
                    } else if (dateFilter === 'week') {
                      const weekAgo = new Date();
                      weekAgo.setDate(now.getDate() - 7);
                      passDate = sessionDate >= weekAgo;
                    } else if (dateFilter === 'month') {
                      const monthAgo = new Date();
                      monthAgo.setMonth(now.getMonth() - 1);
                      passDate = sessionDate >= monthAgo;
                    }
                  }

                  // Shot Type Filter
                  let passShotType = true;
                  if (shotTypeFilter !== 'all') {
                    // Check if session contains at least one shot of the selected type
                    // If shots list is empty or doesn't exist, we fallback to false if filtering
                    passShotType = session.shots?.some(s => s.shotType === shotTypeFilter) || false;
                  }

                  return passDate && passShotType;
                });

                return filtered.length === 0 ? (
                  <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-50">
                    <Video size={64} className="mb-6 text-white/20" />
                    <h3 className="text-xl font-bold mb-2">Aucune session trouvée</h3>
                    <p className="max-w-xs mx-auto">Essayez de changer les filtres ou commencez un entraînement.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((session) => (
                      <motion.div 
                        key={session.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass-card overflow-hidden group hover:border-brand-orange/50 transition-all cursor-pointer"
                      >
                        <div className="aspect-video relative overflow-hidden">
                          <video 
                            src={session.videoUrl} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-4 bg-white/20 backdrop-blur-md rounded-full">
                              <Play fill="white" className="text-white" />
                            </div>
                          </div>
                          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] font-bold">
                            {session.duration}
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            {(() => {
                              let displayAccuracy = session.accuracy;
                              let labelSuffix = "Acc.";
                              
                              if (shotTypeFilter !== 'all') {
                                const specificShots = session.shots?.filter(s => s.shotType === shotTypeFilter) || [];
                                if (specificShots.length > 0) {
                                  const made = specificShots.filter(s => s.outcome === 'made').length;
                                  displayAccuracy = Math.round((made / specificShots.length) * 100);
                                  labelSuffix = `${shotTypeFilter === 'Jump Shot' ? 'Jump' : shotTypeFilter} Acc.`;
                                }
                              }

                              return (
                                <>
                                  <div>
                                    <div className="text-xs text-white/40 mb-1">{session.timestamp}</div>
                                    <div className="font-bold">Session d'entraînement</div>
                                  </div>
                                  <div className="px-2 py-1 bg-brand-orange/20 text-brand-orange rounded text-[10px] font-bold">
                                    {displayAccuracy}% {labelSuffix}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                          
                          {session.notes && (
                            <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/5 italic text-xs text-white/60 line-clamp-2">
                               "{session.notes}"
                            </div>
                          )}

                          <div className="flex gap-2">
                             <a 
                               href={session.videoUrl} 
                               download={`hoopvision-session-${session.id}.webm`}
                               className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-center transition-colors"
                               onClick={(e) => e.stopPropagation()}
                             >
                               Télécharger
                             </a>
                             <button className="flex-1 py-2 bg-brand-orange/20 text-brand-orange hover:bg-brand-orange/30 rounded-lg text-xs font-bold transition-colors">
                               Analyser
                             </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => profile && setShowProfileModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-brand-surface border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5" key="profile-modal-bg-icon">
                <Settings size={120} />
              </div>
              
              <div className="relative z-10">
                <h2 className="text-2xl font-bold italic serif mb-1">Configuration Profil</h2>
                <p className="text-white/40 text-sm mb-8">Aidez notre IA à mieux analyser vos mouvements.</p>
                
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveProfile({
                      name: formData.get('name') as string,
                      age: Number(formData.get('age')),
                      height: Number(formData.get('height')),
                      weight: Number(formData.get('weight')),
                    });
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <ProfileInput label="Nom" name="name" defaultValue={profile?.name || user?.displayName || ''} placeholder="John Doe" />
                    <div className="grid grid-cols-3 gap-4">
                      <ProfileInput label="Âge" name="age" type="number" defaultValue={profile?.age || 20} />
                      <ProfileInput label="Taille (cm)" name="height" type="number" defaultValue={profile?.height || 185} />
                      <ProfileInput label="Poids (kg)" name="weight" type="number" defaultValue={profile?.weight || 80} />
                    </div>
                  </div>
                  
                  <div className="pt-4 flex gap-3">
                    {profile && (
                      <button 
                         type="button"
                         onClick={() => setShowProfileModal(false)}
                         className="flex-1 py-4 bg-white/5 rounded-2xl font-bold hover:bg-white/10 transition-all"
                      >
                         Annuler
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="flex-[2] py-4 bg-brand-orange text-white rounded-2xl font-bold hover:brightness-110 transition-all neon-orange-shadow"
                    >
                      Sauvegarder
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Screen (If not logged in) */}
      {!user && !walletAddress && activeTab !== 'live' && (
        <div className="fixed inset-0 z-50 bg-brand-dark flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-brand-orange rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-orange/40 mb-10">
            <Target className="text-white w-10 h-10" />
          </div>
          <h2 className="text-4xl font-bold italic serif mb-4">HoopVision AI</h2>
          <p className="text-white/40 max-w-sm mb-10 leading-relaxed italic">
            Connectez-vous pour débloquer votre tableau de bord, vos statistiques avancées et le coaching IA personnalisé.
          </p>
          
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <button 
              onClick={loginWithGoogle}
              className="w-full px-10 py-5 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-xl"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="google" />
              Se connecter avec Google
            </button>

            <button 
              onClick={loginWithMetaMask}
              className="w-full px-10 py-5 bg-black border border-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-xl"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Monkey_Face.svg" className="w-6 h-6" alt="metamask" />
              Se connecter avec MetaMask
            </button>

            <AnimatePresence>
              {errorStatus && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key="error-msg"
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold"
                >
                  {errorStatus}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Post-Match Analysis Modal */}
      <AnimatePresence>
        {(isAnalyzing || postMatchAnalysis) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            {isAnalyzing ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex flex-col items-center"
              >
                <div className="w-24 h-24 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-6" />
                <h3 className="text-2xl font-bold italic serif text-white animate-pulse">Génération de l'Analyse IA...</h3>
                <p className="text-white/40 mt-2">Le coach analyse vos mouvements frame par frame</p>
              </motion.div>
            ) : (
              <AnalysisView 
                analysis={postMatchAnalysis} 
                onClose={() => setPostMatchAnalysis(null)} 
              />
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Save Session Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-brand-surface border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5" key="save-modal-bg-icon">
                <Target size={120} />
              </div>
              
              <div className="relative z-10">
                <h2 className="text-2xl font-bold italic serif mb-1">Session Terminée</h2>
                <p className="text-white/40 text-sm mb-6">Excellent travail ! Enregistrez votre progression.</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase mb-1">Précision</div>
                    <div className="text-xl font-bold text-brand-neon">{sessionToSave?.metrics.elbowAngle || 0}%</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase mb-1">Paniers</div>
                    <div className="text-xl font-bold text-brand-orange">{sessionToSave?.metrics.madeShots || 0} / {(sessionToSave?.metrics.madeShots || 0) + (sessionToSave?.metrics.missedShots || 0)}</div>
                  </div>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveSession(formData.get('notes') as string);
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Notes de session</label>
                    <textarea 
                      name="notes"
                      placeholder="Comment vous êtes-vous senti aujourd'hui ? (ex: Fatigue, focus sur le poignet...)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand-orange/50 transition-colors text-white h-32 resize-none"
                    />
                  </div>
                  
                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowSaveModal(false);
                        setSessionToSave(null);
                      }}
                      className="flex-1 py-4 bg-white/5 rounded-2xl font-bold hover:bg-white/10 transition-all text-white/60"
                      disabled={isSaving}
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="flex-[2] py-4 bg-brand-orange text-white rounded-2xl font-bold hover:brightness-110 transition-all neon-orange-shadow flex items-center justify-center gap-2"
                    >
                      {isSaving ? "Enregistrement..." : "Enregistrer la Session"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileInput({ label, name, defaultValue, type = "text", placeholder }: { label: string, name: string, defaultValue: any, type?: string, placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">{label}</label>
      <input 
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand-orange/50 transition-colors text-white"
        required
      />
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 transition-all p-2 rounded-xl group relative",
        active ? "text-brand-orange" : "text-white/40 hover:text-white"
      )}
    >
      <div className={cn(
        "p-2.5 rounded-xl transition-all",
        active ? "bg-brand-orange/10" : "group-hover:bg-white/5"
      )}>
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider hidden md:block">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeNav"
          className="absolute -right-0.5 top-1/4 bottom-1/4 w-1 bg-brand-orange rounded-full hidden md:block" 
        />
      )}
    </button>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap",
        active ? "bg-brand-orange text-white shadow-lg shadow-brand-orange/20" : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      {label}
    </button>
  );
}

function StatCard({ icon, value, label, color = "text-white", trend }: { icon: React.ReactNode, value: string, label: string, color?: string, trend?: string }) {
  return (
    <div className="glass-card p-5 flex flex-col items-center justify-center text-center relative overflow-hidden group">
      <div className={cn("mb-3 p-3 rounded-full bg-white/5 transition-transform group-hover:scale-110", color)}>
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <div className="text-2xl font-bold italic serif tracking-tight">{value}</div>
      <div className="text-[10px] text-white/40 uppercase font-mono mt-1 tracking-widest">{label}</div>
      {trend && (
        <div className={cn(
          "absolute top-3 right-3 text-[8px] font-bold px-1.5 py-0.5 rounded",
          trend.includes('+') || (trend.includes('%') && !trend.includes('-')) ? "bg-brand-neon/20 text-brand-neon" : "bg-red-500/20 text-red-400"
        )}>
          {trend}
        </div>
      )}
    </div>
  );
}

function AnalysisRow({ label, value, status, warning = false, active = false }: { label: string, value: string, status: string, warning?: boolean, active?: boolean }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="space-y-1">
        <div className="text-white/40 text-xs uppercase font-mono">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
      <div className={cn(
          "px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all duration-300",
          warning ? "bg-red-500/10 text-red-400" : 
          active ? "bg-brand-orange text-white neon-orange-shadow scale-110" :
          "bg-brand-neon/10 text-brand-neon"
      )}>
        {status}
      </div>
    </div>
  );
}
