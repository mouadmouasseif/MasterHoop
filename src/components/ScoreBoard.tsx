import { motion } from "motion/react";

type ScoreBoardProps = {
  madeCount: number;
  missCount: number;
};

export default function ScoreBoard({ madeCount, missCount }: ScoreBoardProps) {
  const totalShots = madeCount + missCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="pointer-events-none rounded-2xl border border-white/10 bg-black/55 px-3 py-2 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:px-5 sm:py-3"
    >
      <div className="grid grid-cols-3 items-center gap-2 text-center sm:gap-4">
        <ScoreValue label="MISS" value={missCount} color="text-red-300" glow="shadow-red-500/25" />
        <ScoreValue label="MADE" value={madeCount} color="text-brand-neon" glow="shadow-brand-neon/25" />
        <ScoreValue label="SHOTS" value={totalShots} color="text-white" glow="shadow-white/15" />
      </div>
    </motion.div>
  );
}

function ScoreValue({
  label,
  value,
  color,
  glow,
}: {
  label: string;
  value: number;
  color: string;
  glow: string;
}) {
  return (
    <div className={`min-w-[68px] rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 shadow-lg ${glow} sm:min-w-[88px]`}>
      <motion.div
        key={value}
        initial={{ y: 8, opacity: 0, scale: 0.88 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        className={`text-xl font-black leading-none sm:text-2xl ${color}`}
      >
        {value}
      </motion.div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/42 sm:text-[10px]">
        {label}
      </div>
    </div>
  );
}
