/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});
export async function getCoachFeedback(stats: any, targetedMoves?: string[]) {
  try {
    const targetedContext = targetedMoves && targetedMoves.length > 0 
      ? `\nFocus spécifique sur ces mouvements : ${targetedMoves.join(', ')}. Donne des conseils ultra-spécifiques pour les améliorer.`
      : '';

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Tu es un coach de basket expert assisté par IA. Analyse ces statistiques de session et donne 3 conseils précis et motivants en français.${targetedContext}

Statistiques :
- Taux de réussite : ${stats.accuracy}%
- Angle moyen du coude : ${stats.elbowAngle}°
- Vitesse de déclenchement : ${stats.releaseTime}s
- Position des pieds : ${stats.footPlacement}
- Fatigue détectée : ${stats.fatigueLevel}%

Format de réponse : JSON avec une liste de 3 strings sous la clé 'tips'.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || '{"tips": ["Continue à t\'entraîner !", "Reste concentré sur ton geste.", "Analyse tes vidéos."]}');
  } catch (error) {
    console.error("Gemini Error:", error);
    return { tips: ["Erreur de connexion au coach IA.", "Vérifie tes réglages.", "Réessaie plus tard."] };
  }
}

export async function generatePostMatchAnalysis(sessionData: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Tu es un analyste de basketball professionnel. 
      Réalise un compte-rendu d'entraînement détaillé en français basé sur les données suivantes :
      
      Résumé de la session :
      - Durée : ${sessionData.duration}s
      - Mouvements détectés : ${JSON.stringify(sessionData.moves)}
      - Statistiques de dribble : Puissance avg ${sessionData.avgDribblePower}%, Rythme avg ${sessionData.avgDribbleRhythm} BPM
      - Shooting : Forme avg ${sessionData.avgFormScore}/100
      
      Format de réponse attendu (JSON uniquement) :
      {
        "summary": "Un paragraphe d'analyse globale",
        "kpis": [
          {"label": "Nom de l'indicateur", "value": "Valeur", "assessment": "Excellent/Bon/A améliorer"}
        ],
        "strengths": ["Force 1", "Force 2"],
        "weaknesses": ["Lacune 1", "Lacune 2"],
        "drills": [
          {"name": "Nom de l'exercice", "description": "Instructions détaillées"}
        ]
      }`,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
}

export async function getBasketballNews() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Donne-moi les 3 dernières actualités majeures du basketball mondial (NBA, Euroleague) avec des résumés courts et percutants.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
        title: chunk.web?.title,
        url: chunk.web?.uri
      })) || []
    };
  } catch (error) {
    console.error("News Fetch Error:", error);
    return { text: "Impossible de récupérer les actualités pour le moment.", sources: [] };
  }
}
