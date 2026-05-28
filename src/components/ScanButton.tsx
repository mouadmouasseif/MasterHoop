import { Radar, ScanSearch } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

export default function ScanButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04, y: -1 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        "relative flex min-h-12 items-center gap-2 overflow-hidden rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-widest shadow-xl backdrop-blur-xl transition sm:min-h-14",
        active
          ? "border-brand-neon/45 bg-brand-neon/15 text-brand-neon shadow-brand-neon/20"
          : "border-white/10 bg-black/55 text-white/72 hover:border-brand-blue/45 hover:bg-brand-blue/15 hover:text-white",
      )}
    >
      {active && (
        <motion.span
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,148,.24),transparent_58%)]"
          animate={{ scale: [0.85, 1.35], opacity: [0.85, 0] }}
          transition={{ repeat: Infinity, duration: 1.35, ease: "easeOut" }}
        />
      )}
      <span className="relative grid h-7 w-7 place-items-center rounded-xl bg-white/8">
        {active ? <Radar size={17} className="animate-pulse" /> : <ScanSearch size={17} />}
      </span>
      <span className="relative hidden sm:inline">{active ? "Scanning" : "Scan Court"}</span>
    </motion.button>
  );
}
