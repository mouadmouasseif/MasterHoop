import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// 🔥 sécurité (évite écran blanc si clé manquante)
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY is missing in .env file");
}

const ai = new GoogleGenAI({
  apiKey,
});

export async function getCoachFeedback(stats: any, targetedMoves?: string[]) {
  try {
    const targetedContext =
      targetedMoves?.length > 0
        ? `\nFocus spécifique sur ces mouvements : ${targetedMoves.join(", ")}. Donne des conseils ultra-spécifiques.`
        : "";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
Tu es un coach de basket expert assisté par IA.
Analyse ces statistiques et donne 3 conseils précis en français.${targetedContext}

Statistiques :
- Taux de réussite : ${stats.accuracy}%
- Angle moyen du coude : ${stats.elbowAngle}°
- Vitesse de déclenchement : ${stats.releaseTime}s
- Position des pieds : ${stats.footPlacement}
- Fatigue détectée : ${stats.fatigueLevel}%

Réponds UNIQUEMENT en JSON :
{"tips": ["...", "...", "..."]}
      `,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text ?? '{"tips": []}');
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      tips: [
        "Erreur de connexion au coach IA.",
        "Vérifie ta clé API.",
        "Réessaie plus tard.",
      ],
    };
  }
}

export async function generatePostMatchAnalysis(sessionData: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
Analyse cette session de basketball :

- Durée : ${sessionData.duration}s
- Mouvements : ${JSON.stringify(sessionData.moves)}
- Dribble puissance : ${sessionData.avgDribblePower}%
- Rythme : ${sessionData.avgDribbleRhythm} BPM
- Shooting : ${sessionData.avgFormScore}/100

Réponds UNIQUEMENT en JSON :
{
  "summary": "...",
  "kpis": [],
  "strengths": [],
  "weaknesses": [],
  "drills": []
}
      `,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text ?? "{}");
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
}

export async function getBasketballNews() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents:
        "Donne 3 actualités importantes du basketball (NBA, Euroleague) en français.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text,
      sources:
        response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(
          (chunk: any) => ({
            title: chunk.web?.title,
            url: chunk.web?.uri,
          })
        ) || [],
    };
  } catch (error) {
    console.error("News Fetch Error:", error);
    return {
      text: "Impossible de récupérer les actualités.",
      sources: [],
    };
  }
}