# Audit BasketMotion-Ai AI — Sprints 1 et 2

Date : 30 juillet 2026. Branche auditée : `main`. État initial du dépôt : propre.

## Architecture initiale

- Point d’entrée : `src/main.tsx`, puis un `App.tsx` monolithique.
- Navigation initiale : état local `activeTab` et `switch`, sans URL partageable.
- Interface : pages React chargées paresseusement, barre latérale, PWA Vite.
- Firebase : initialisation dans `src/lib/firebase.ts`; Authentication Google, Firestore et Storage.
- Données : `users`, sous-collection `users/{uid}/sessions`, `trainingSessions`, `aiReports`, `trainings`, `analyses`, `reports`, `videos`, `friends`, invitations sociales, équipes, matchs, notifications et highlights.
- Analyse : MoveNet dans `src/lib/poseDetection.ts`, détecteur spécialisé optionnel et COCO-SSD dans `src/services/basketballObjectDetector.ts`, prétraitement OpenCV dans `src/workers/opencvPreprocessing.worker.ts`.
- ML : chaîne Python dans `ml/ball-detector`.

## Fonctions réellement opérationnelles au départ

- Authentification Google Firebase et lecture du profil.
- Capture caméra et import vidéo avec contrôle de format/durée.
- Inférence MoveNet et chargement optionnel d’un GraphModel TensorFlow.js.
- Fallback COCO-SSD en cas d’échec de chargement du modèle spécialisé.
- Prétraitement OpenCV dans un Web Worker avec repli Canvas.
- Sauvegarde privée de sessions dans Firebase Storage et Firestore.
- Historique, drills, équipes, amis, matchs, notifications et PWA déjà présents à des degrés variables.
- 13 tests unitaires initiaux passants.

## Fonctions partielles ou trompeuses détectées

- Le modèle spécialisé ne basculait pas vers COCO-SSD lorsque son inférence ne retournait aucun ballon fiable.
- Un panier configuré à une position fixe était présenté comme détecté et une projection balistique produisait automatiquement `made` ou `missed`.
- Le module d’analyse avancée créait un panier, une heatmap, des trajectoires et des statistiques attaque/défense non observées.
- La caméra de match générait aléatoirement des événements et statistiques en les décrivant comme des détections IA.
- Des graphiques de progression et valeurs d’interface étaient affichés en l’absence de données sans marquage de démonstration.
- Le formulaire de profil ne persistait pas le nouveau profil dans Firestore.
- Les rôles, invitations et accès coach-athlète n’étaient pas centralisés.

Ces simulations ont été supprimées ou rendues explicitement illustratives. Le résultat d’un tir automatique reste désormais `unknown` tant qu’un panier et un passage dans le cercle ne sont pas observés. Les annotations manuelles sont marquées `manual_user_annotation`.

## Risques de sécurité initiaux

- Les règles `users` permettaient à un utilisateur de modifier son document sans protéger les champs de rôle, club ou statut.
- Les analyses étaient limitées au propriétaire mais ne prenaient pas en charge l’association coach-athlète ou l’isolation club.
- La PWA mettait en cache des URL Firebase Storage privées pendant 24 heures.
- Les documents secondaires utilisaient plusieurs noms de propriétaire (`userId`, `ownerId`) sans stratégie de migration.
- Aucune suite d’émulateur Firebase n’était configurée.

Corrections : claims serveur pour les rôles élevés, propriétaire/club immuables, liens coach-athlète actifs, comptes suspendus refusés, MIME et tailles contrôlés, cache PWA privé supprimé, tests d’émulateur ajoutés.

## Risques de performance

- TensorFlow, Firebase et OpenCV forment des bundles lourds. Les chunks sont séparés, mais le build initial a dépassé trois minutes dans cet environnement.
- MoveNet et le détecteur de ballon fonctionnent en parallèle à chaque image analysée.
- OpenCV est déjà chargé dans un Worker, mais son runtime reste volumineux.
- Le gestionnaire de modèles ajouté permet le chargement/déchargement à la demande; le détecteur de ballon n’est pas préchargé comme modèle critique.

## Dette technique restante

- `lint` exécute seulement `tsc --noEmit`; aucun ESLint n’est configuré.
- `strict` n’est pas activé dans TypeScript et plusieurs composants historiques utilisent `any`.
- Les textes historiques contiennent des problèmes d’encodage.
- Plusieurs collections sociales historiques ont des doublons de nom (`friend_requests` et `friendRequests`).
- Les rôles élevés nécessitent une procédure backend/Admin SDK pour définir les custom claims.
- Les pages coach, club et super-admin ont des routes protégées mais leurs outils métier sont volontairement annoncés comme futurs.
- Les tests Firebase ne peuvent pas démarrer sur le Java 8 présent; Firebase Tools exige Java 21 ou plus.

## Dépendances critiques

- React 19, React Router 7, Firebase 12, TensorFlow.js 4, MoveNet, COCO-SSD, OpenCV JS, Vite 6 et vite-plugin-pwa.
- Après ajout des outils de test Firebase : 1 302 paquets, avec 41 alertes npm signalées (3 faibles, 5 modérées, 32 élevées, 1 critique). Le détail distant de `npm audit` n’a pas été envoyé, conformément au refus de divulgation de métadonnées par l’environnement. Les outils Firebase sont des dépendances de développement; une revue et des mises à niveau ciblées restent nécessaires.
- Node 23.5 produit un avertissement car `superstatic` annonce les versions 20, 22 ou 24.

## Résultats de référence

- État initial `npm run lint` : succès.
- État initial `npm run test` : 7 fichiers, 13 tests, tous passants.
- État initial `npm run build` : délai dépassé après 184 secondes, sans diagnostic de compilation avant l’arrêt.
- Après implémentation, contrôle TypeScript intermédiaire : succès.
- Après implémentation, tests unitaires : 10 fichiers, 20 tests, tous passants.
- Tests Firebase : lancés mais émulateurs refusés, JDK 21 requis.

Build final Vite/PWA : succès; service worker et manifeste générés. Les gros chunks TensorFlow/Firebase et le runtime OpenCV restent à optimiser; détails dans `docs/TESTING.md`.

## Plan de migration

1. Lire les anciens profils comme des athlètes actifs, sans réécriture automatique.
2. Ajouter progressivement `role`, `accountStatus`, `clubId`, `coachId` et `athleteIds`.
3. Définir les rôles élevés et `clubId` avec l’Admin SDK sous forme de custom claims.
4. Créer les liens `coachAthleteLinks/{coachId}_{athleteId}` seulement après consentement de l’athlète.
5. Écrire les nouvelles analyses avec `ownerId` et `athleteId`, tout en lisant encore `userId`.
6. Déployer les règles, indexes et claims dans un environnement de préproduction avant production.

## Problèmes à corriger avant le Sprint 3

- Installer JDK 21 et exécuter les tests d’émulateur.
- Résoudre ou accepter explicitement les alertes de dépendances.
- Ajouter de vraies fixtures vidéo autorisées pour les tests de régression IA.
- Valider les seuils du détecteur spécialisé sur appareils mobiles réels.
- Ne pas activer les métriques de tir, de terrain ou biomécaniques avancées avant modèles/calibration validés.
