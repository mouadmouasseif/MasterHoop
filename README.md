# BasketMotion-Ai AI

Plateforme React, TypeScript et Vite d’analyse locale et d’entraînement basketball. Les Sprints 1 à 3 fournissent le routage par rôles, les contrôles Firebase, l’architecture de modèles, le suivi du ballon et un moteur temporel du tir fondé sur des observations 2D. Le socle du Sprint 4 ajoute la calibration projective, les distances conditionnelles, l’observation prudente du résultat, les highlights et la comparaison de séances compatibles.

## Démarrage

1. Copier `.env.example` vers `.env.local` et renseigner une application Web Firebase autorisée.
2. Installer les dépendances avec `npm install`.
3. Lancer `npm run dev`.

Contrôles disponibles :

```text
npm run lint
npm run typecheck
npm run test
npm run test:firebase
npm run fixtures:video
npm run build
```

`test:firebase` nécessite JDK 21 ou plus récent. `fixtures:video` régénère uniquement les quatre clips WebM synthétiques et CC0 décrits dans `tests/fixtures/videos/manifest.json`. Les vidéos réelles, modèles privés et données personnelles ne doivent jamais être ajoutés au dépôt.

## Modèle de ballon

Le détecteur spécialisé est prioritaire lorsqu’il est configuré :

```env
VITE_BALL_MODEL_URL=/models/basketball/model.json
```

Si son chargement ou son inférence échoue, ou si aucune détection n’atteint le seuil, COCO-SSD est chargé à la demande. Une absence de résultat des deux moteurs reste indisponible.

## Analyse du tir

Le moteur temporel produit une timeline, une trajectoire 2D, des métriques prudentes, une confiance et les preuves utilisées. Les points prédits par le tracker ne sont jamais utilisés comme mesures.

Sans calibration valide et sans observation conjointe du ballon et du cercle :

- le résultat reste `unknown` ;
- le type reste `unknown` ;
- les distances en mètres restent indisponibles ;
- le transfert de puissance reste indisponible ;
- aucune zone 2/3 points n’est annoncée.

Voir `docs/AI_PIPELINE.md`, `docs/BIOMECHANICS.md`, `docs/FIREBASE_SECURITY.md` et `docs/ROADMAP.md`.
