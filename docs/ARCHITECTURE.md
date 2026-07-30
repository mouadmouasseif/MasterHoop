# Architecture

## Application

`src/main.tsx` installe `BrowserRouter` et `AuthProvider`. `src/routes/AppRouter.tsx` déclare les routes publiques et les espaces athlète, coach, club et administration. `ProtectedRoute` vérifie l’authentification, le statut actif et le rôle. `AuthenticatedLayout` conserve les composants historiques et fournit leur état via `AppShellContext`.

Les pages lourdes restent chargées avec `React.lazy`. La migration de l’ancien `activeTab` est progressive : la barre latérale traduit chaque onglet en URL grâce à `src/routes/paths.ts`.

## Accès

`src/auth` normalise les profils historiques. `src/permissions` centralise les capacités et les relations d’accès côté client. Les décisions sensibles sont répétées dans les services Firebase et les règles Firestore/Storage ; l’interface n’est jamais la seule barrière.

## IA et modèles

`src/ai/types` contient les contrats communs. `ModelRegistry` décrit versions, formats et statuts. `CentralModelManager` déduplique le chargement, applique un délai, expose les erreurs et libère les ressources. `HybridBallModelAdapter` relie le moteur existant au contrat `VisionModelAdapter`.

Le pipeline cloud reste uniquement un contrat. Aucune réponse cloud n’est simulée.

## Analyse temporelle du tir

Le Sprint 3 sépare les responsabilités :

```text
ShotFrameObservation
  → ShotPhaseDetector
  → ShotTrajectoryAnalyzer
  → BiomechanicsAnalyzer
  → ConfidenceCalculator
  → AnalysisExplainer
  → ShotSequenceAnalysis
```

`ShotAnalysisEngine` orchestre ces modules sans dépendre de React ni de Firebase. `PoseAnalyzer` lui transmet les poses, dimensions, temps et points du ballon. Les imports vidéo utilisent une passe qualité puis une fenêtre dense autour des tirs candidats. Les enregistrements en direct utilisent des temps relatifs au début de la capture.

Le résultat est persisté avec la session et affiché dans `AIAnalyticsPanel` et `SessionPlayer`. Le lecteur ne superpose que le ballon réellement observé à l’instant courant.

## Données

Les vidéos restent dans Storage. Firestore contient métadonnées et résultats. Les nouvelles analyses utilisent `ownerId` et `athleteId` ; un normaliseur lit encore les anciens documents `userId`.

Les documents de session peuvent contenir `shotAnalysis`. Les anciens documents sans ce champ restent lisibles et affichent simplement une timeline indisponible.

## PWA

Workbox conserve le shell applicatif et le runtime OpenCV. Les réponses privées Firebase Storage ne sont pas placées dans un cache applicatif persistant. `navigateFallback: '/'` permet le rechargement des routes côté PWA ; l’hébergeur doit également renvoyer `index.html` pour les routes applicatives.
