import { Maximize2, Minimize2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

export default function FullscreenButton({
  active,
  onClick,
  className,
}: {
  active?: boolean;
  onClick: () => void;
  className?: string;
}) {
  const Icon = active ? Minimize2 : Maximize2;

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.06, y: -1 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      aria-label={active ? "Exit fullscreen" : "Enter fullscreen"}
      title={active ? "Exit fullscreen" : "Fullscreen"}
      className={cn(
        "grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/55 text-white shadow-xl shadow-black/30 backdrop-blur-xl transition hover:border-brand-orange/50 hover:bg-brand-orange/15 hover:text-brand-orange hover:shadow-brand-orange/25 sm:h-14 sm:w-14",
        className,
      )}
    >
      <Icon size={21} strokeWidth={2.4} />
    </motion.button>
  );
}
