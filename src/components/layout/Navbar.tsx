import { Activity, Square } from "lucide-react";
import { signOut, type User as FirebaseUser } from "firebase/auth";
import { cn } from "@/src/lib/utils";
import { auth } from "@/src/lib/firebase";
import type { ActiveTab, UserProfile } from "@/src/types";
import masterHoopLogo from "@/src/assets/master-hoop-logo.png";

type Props = {
  isImmersive: boolean;
  activeTab: ActiveTab;
  user: FirebaseUser | null;
  walletAddress: string | null;
  profile: UserProfile | null;

  onGoogleLogin?: () => void;
  onMetaMaskLogin?: () => void;
  onOpenProfile: () => void;
  onDisconnectWallet: () => void;
};

export default function Navbar({
  isImmersive,
  activeTab,
  user,
  walletAddress,
  profile,
  onGoogleLogin,
  onMetaMaskLogin,
  onOpenProfile,
  onDisconnectWallet,
}: Props) {
  const handleLogout = () => {
    if (user) signOut(auth);
    if (walletAddress) onDisconnectWallet();
  };

  return (
    <header
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 transition-all duration-500",
        isImmersive && activeTab === "live" && "opacity-0 h-0 mb-0 overflow-hidden"
      )}
    >
      {/* LOGO */}
      <div className="flex items-center gap-3">
        <img
          src={masterHoopLogo}
          alt="Master Hoop logo"
          className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/10"
        />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Hoop</h1>
          <p className="text-white/40 text-sm mt-1">
            Analyse de performance basketball en temps réel
          </p>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex items-center gap-3">
        {!user && !walletAddress ? (
          <div className="flex gap-2">
            <button
              onClick={() => onGoogleLogin?.()}
              className="px-5 py-2.5 bg-brand-orange text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-brand-orange/20"
            >
              Login
            </button>

            <button
              onClick={() => onMetaMaskLogin?.()}
              className="px-3 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
              title="Connect MetaMask"
            >
              <Activity size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* USER INFO */}
            <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-white">
                {walletAddress
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : profile?.name || user?.displayName || "Player"}
              </div>

              <div className="text-[10px] text-white/40 uppercase font-mono">
                {profile?.totalSessions || 0} Sessions
              </div>
            </div>

            {/* AVATAR */}
            <button
              onClick={onOpenProfile}
              className="w-10 h-10 rounded-xl border-2 border-brand-orange/40 overflow-hidden hover:scale-105 transition-all"
            >
              <img
                src={
                  user?.photoURL ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${
                    user?.uid || walletAddress
                  }`
                }
                alt="avatar"
              />
            </button>

            {/* LOGOUT */}
            <button
              onClick={handleLogout}
              className="p-2 text-white/40 hover:text-red-400 transition-colors"
              title="Déconnexion"
            >
              <Square size={16} fill="currentColor" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}