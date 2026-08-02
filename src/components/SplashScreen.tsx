import { motion } from "motion/react";
import basketMotionAiLogo from "@/src/assets/basketmotion-logo.png";
import { BRAND_NAME, BRAND_TAGLINE } from "@/src/shared/brand";

export default function SplashScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-brand-dark text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="flex flex-col items-center gap-5"
      >
        <motion.img
          src={basketMotionAiLogo}
          alt={BRAND_NAME}
          className="h-24 w-24 rounded-3xl object-cover shadow-2xl shadow-brand-orange/25"
          animate={{ rotate: [0, -4, 4, 0] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
        />
        <div className="text-center">
          <div className="text-2xl font-black uppercase tracking-widest">{BRAND_NAME}</div>
          <div className="mt-2 text-xs font-black uppercase tracking-[0.28em] text-brand-orange">{BRAND_TAGLINE}</div>
        </div>
        <div className="h-1 w-44 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full bg-brand-orange" animate={{ x: ["-100%", "120%"] }} transition={{ repeat: Infinity, duration: 1.1 }} />
        </div>
      </motion.div>
    </div>
  );
}
