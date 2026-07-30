import type { DrillCategory } from "@/src/types";

export type TrainingDrill = {
  id: string;
  title: string;
  category: DrillCategory;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Pro";
  duration: string;
  videoUrl: string;
  thumbnail: string;
  description: string;
  source: "youtube" | "firebase" | "ai-generated";
  tags: string[];
};

export const drillLibrary: TrainingDrill[] = [
  {
    id: "defensive-slides",
    title: "Defensive Slides",
    category: "Defense",
    difficulty: "Beginner",
    duration: "8 min",
    videoUrl: "https://www.youtube.com/results?search_query=basketball+defensive+slides+drill",
    thumbnail: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=900",
    description: "Travail d'appuis lateraux, hanches basses et controle de distance sur porteur.",
    source: "youtube",
    tags: ["lateral movement", "defense", "closeout"],
  },
  {
    id: "closeout-drill",
    title: "Closeout Drill",
    category: "Defense",
    difficulty: "Intermediate",
    duration: "10 min",
    videoUrl: "firebase://drills/closeout-drill.mp4",
    thumbnail: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=900",
    description: "Sprint, freinage, main haute et contestation sans se faire battre sur le premier pas.",
    source: "firebase",
    tags: ["contest", "reaction", "defense"],
  },
  {
    id: "mirror-drill",
    title: "Mirror Drill",
    category: "Footwork",
    difficulty: "Advanced",
    duration: "12 min",
    videoUrl: "ai://generated/mirror-drill",
    thumbnail: "https://images.unsplash.com/photo-1519861531158-21603874116?auto=format&fit=crop&q=80&w=900",
    description: "Lecture du porteur, reaction immediate et maintien de l'angle defensif.",
    source: "ai-generated",
    tags: ["lateral movement", "reaction", "footwork"],
  },
  {
    id: "form-shooting-ladder",
    title: "Form Shooting Ladder",
    category: "Shooting",
    difficulty: "Beginner",
    duration: "15 min",
    videoUrl: "https://www.youtube.com/results?search_query=form+shooting+basketball+drill",
    thumbnail: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&q=80&w=900",
    description: "Progression proche panier vers mi-distance avec tenue du follow-through.",
    source: "youtube",
    tags: ["shot consistency", "elbow alignment", "release"],
  },
  {
    id: "change-of-pace-series",
    title: "Change of Pace Series",
    category: "Dribbling",
    difficulty: "Advanced",
    duration: "14 min",
    videoUrl: "firebase://drills/change-of-pace.mp4",
    thumbnail: "https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?auto=format&fit=crop&q=80&w=900",
    description: "Ralentir, fixer le defenseur, puis accelerer pour creer l'avantage.",
    source: "firebase",
    tags: ["creation d'espace", "dribbling", "attack"],
  },
  {
    id: "game-speed-finishing",
    title: "Game Speed Finishing",
    category: "Finishing",
    difficulty: "Pro",
    duration: "18 min",
    videoUrl: "ai://generated/game-speed-finishing",
    thumbnail: "https://images.unsplash.com/photo-1505666287802-931dc83a6d87?auto=format&fit=crop&q=80&w=900",
    description: "Finitions avec contact simule, mauvais appui et angle court.",
    source: "ai-generated",
    tags: ["finishing", "contact", "conditioning"],
  },
  {
    id: "conditioning-closeouts",
    title: "Conditioning Closeouts",
    category: "Conditioning",
    difficulty: "Intermediate",
    duration: "16 min",
    videoUrl: "firebase://drills/conditioning-closeouts.mp4",
    thumbnail: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=80&w=900",
    description: "Closeouts repetes sous fatigue avec mesure de reaction et posture.",
    source: "firebase",
    tags: ["conditioning", "defense", "reaction"],
  },
];

export function recommendDrills(weaknesses: string[] = []) {
  if (weaknesses.length === 0) return drillLibrary.slice(0, 3);
  const normalized = weaknesses.map((weakness) => weakness.toLowerCase());
  const matches = drillLibrary.filter((drill) =>
    drill.tags.some((tag) => normalized.some((weakness) => weakness.includes(tag) || tag.includes(weakness))),
  );
  return (matches.length ? matches : drillLibrary).slice(0, 3);
}

export function toggleFavoriteDrill(id: string) {
  const current = getFavoriteDrillIds();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  localStorage.setItem("BasketMotion-AiFavoriteDrills", JSON.stringify(next));
  return next;
}

export function getFavoriteDrillIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem("BasketMotion-AiFavoriteDrills") || "[]");
  } catch {
    return [];
  }
}

export function addDrillWatchHistory(id: string) {
  const current = getDrillWatchHistory().filter((item) => item.id !== id);
  const next = [{ id, watchedAt: new Date().toISOString() }, ...current].slice(0, 30);
  localStorage.setItem("BasketMotion-AiDrillWatchHistory", JSON.stringify(next));
  return next;
}

export function getDrillWatchHistory(): { id: string; watchedAt: string }[] {
  try {
    return JSON.parse(localStorage.getItem("BasketMotion-AiDrillWatchHistory") || "[]");
  } catch {
    return [];
  }
}
