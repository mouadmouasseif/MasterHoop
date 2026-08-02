import { Activity, Square } from "lucide-react";
import { signOut, type User as FirebaseUser } from "firebase/auth";
import { cn } from "@/src/lib/utils";
import { auth } from "@/src/lib/firebase";
import type { ActiveTab, UserProfile } from "@/src/types";
import basketMotionAiLogo from "@/src/assets/basketmotion-logo.png";
import { BRAND_NAME, BRAND_SECONDARY_TAGLINE } from "@/src/shared/brand";

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
        "mb-8 flex flex-col justify-between gap-4 transition-all duration-500 md:flex-row md:items-center",
        isImmersive && activeTab === "live" && "h-0 mb-0 overflow-hidden opacity-0",
      )}
    >
      <div className="flex items-center gap-3">
        <img src={basketMotionAiLogo} alt={`${BRAND_NAME} logo`} className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/10" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{BRAND_NAME}</h1>
          <p className="mt-1 text-sm text-white/40">{BRAND_SECONDARY_TAGLINE}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!user && !walletAddress ? (
          <div className="flex gap-2">
            <button onClick={() => onGoogleLogin?.()} className="rounded-xl bg-brand-orange px-5 py-2.5 font-bold text-white shadow-lg shadow-brand-orange/20 transition-all hover:brightness-110">
              Login
            </button>
            <button onClick={() => onMetaMaskLogin?.()} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-bold text-white transition-all hover:bg-white/10" title="Connect MetaMask">
              <Activity size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-xs font-bold text-white">
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : profile?.name || user?.displayName || "Player"}
              </div>
              <div className="font-mono text-[10px] uppercase text-white/40">{profile?.totalSessions || 0} Sessions</div>
            </div>
            <button onClick={onOpenProfile} className="h-10 w-10 overflow-hidden rounded-xl border-2 border-brand-orange/40 transition-all hover:scale-105">
              <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || walletAddress}`} alt="avatar" />
            </button>
            <button onClick={handleLogout} className="p-2 text-white/40 transition-colors hover:text-red-400" title="Deconnexion">
              <Square size={16} fill="currentColor" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
