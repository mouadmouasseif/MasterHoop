# Roadmap

## Terminé — Sprints 1 et 2

- Audit, correction des simulations bloquantes et durcissement PWA.
- Rôles, permissions, guards et routes partageables.
- Profils historiques compatibles, invitations et liens coach-athlète.
- Règles Firestore/Storage renforcées et scénarios Emulator écrits.
- Contrats IA, registre, gestionnaire de modèles et adaptateur hybride.
- Fallback modèle spécialisé → COCO-SSD, tracking observé/prédit et pipeline ML.

## Sprint 3 — noyau livré

- Moteur pur et indépendant de l’interface pour les phases `preparation`, `dip`, `upward_motion`, `release`, `flight` et `landing`.
- Timeline horodatée avec confiance, preuves et limites pour chaque événement.
- Trajectoire calculée uniquement à partir des positions du ballon réellement observées ; les points prédits sont exclus.
- Angle de relâchement, sommet, déplacement et durée exprimés en unités 2D ou normalisées, jamais en mètres sans calibration.
- Biomécanique 2D prudente : décalage bassin/appuis, timing préparation-relâchement et stabilité latérale observable.
- Efficacité et transfert de puissance explicitement indisponibles tant que les signaux nécessaires ne sont pas validés.
- Confiance globale, confiance par sous-système et explicabilité fondée sur les preuves utilisées.
- Intégration aux vidéos importées, aux enregistrements en direct, à la persistance et au lecteur de session.
- Résultat et type de tir conservés à `unknown` sans détecteur de panier ou classifieur validé.
- Suppression de l’arc balistique fictif, du faux score de forme et des zones 2/3 points non calibrées dans la caméra.

### Validation terrain restante

- Quatre clips WebM synthétiques, CC0 et sans personne réelle couvrent tir complet, ballon absent, faible lumière et perte de suivi.
- Ajouter ensuite des clips réels consentis et redistribuables : corps partiel, flou, plusieurs joueurs et caméra instable.
- Valider les seuils sur ces clips avec un coach qualifié ; aucune validation terrain n’est revendiquée à ce stade.
- Temurin JDK 21.0.12 est installé et les 10 scénarios Firebase Emulator passent.

## Sprint 4 — socle démarré

- Calibration par homographie avec état, source, confiance, couverture et erreur de reprojection.
- Distances réelles bloquées sans calibration valide, panier au sol référencé et chevilles visibles au relâchement.
- Résultat `made`/`missed` uniquement lorsque le passage descendant du ballon autour du cercle est observable ; sinon `unknown`.
- Highlights fondés sur les événements observés et comparaison limitée aux métriques compatibles.

### Suite du Sprint 4

- Livrer l’assistant non technique de sélection des repères dans la caméra et invalider automatiquement une calibration après mouvement.
- Brancher un détecteur de cercle validé ou une annotation manuelle traçable aux observations du moteur.
- Découper/exporter réellement les segments vidéo de highlights à partir des fenêtres calculées.
- Valider les seuils sur des clips réels autorisés avec un coach qualifié.

## Sprints suivants

- Sprint 5 : espace coach, annotations, programmes, missions et rapports.
- Sprint 6 : clubs, équipes, présences, statistiques et rapports.
- Sprint 7 : références autorisées, similarité, scouting et stabilité.
- Sprint 8 : intelligence de match progressive avec validation humaine.
- Sprint 9 : mobile, desktop, wearables, cloud, tournois et marketplace sous contrats séparés.

Les routes coach/club/admin restent clairement marquées comme planifiées lorsqu’une fonction métier n’est pas encore réelle.
