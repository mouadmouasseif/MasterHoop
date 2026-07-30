# Détecteur de ballon

Ordre réel : modèle BasketMotion-Ai configuré, puis COCO-SSD, puis indisponible.

Le modèle spécialisé est chargé depuis `VITE_BALL_MODEL_URL`. Une détection spécialisée doit atteindre 0,45 pour alimenter le tracking; sinon COCO-SSD est chargé à la demande. COCO ne conserve que la classe `sports ball` au-dessus de 0,35. Ces seuils servent au tracking, pas à un diagnostic : une métrique définitive reste soumise au seuil global de 0,60.

Chaque résultat normalisé conserve frame, horodatage, boîte, centre, confiance et détecteur. `BallTemporalTracker` sélectionne le candidat cohérent, lisse centre/vitesse, calcule l’accélération et prédit au maximum trois frames. Une prédiction porte `observed: false`; elle ne valide jamais la présence réelle ni le résultat d’un tir. Après perte prolongée, la piste est réinitialisée.

Le pipeline d’entraînement est documenté dans `ml/ball-detector/README.md`. `configs/baseline.json` bloque le déploiement si précision, rappel, F1, mAP@0.50, temps d’inférence ou poids du modèle ne respectent pas les critères.
