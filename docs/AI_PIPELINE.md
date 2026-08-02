# Pipeline IA

## Contrats et exécution

Les contrats communs sont définis dans `src/ai/types/index.ts`. Les modes `realtime`, `uploaded_video` et `offline` représentent des traitements locaux. `cloud` reste un contrat d’extension et n’est pas présenté comme disponible sans backend réel.

`ShotAnalysisEngine` est un orchestrateur indépendant de React. Il reçoit des `ShotFrameObservation` horodatées et compose :

1. détection des phases ;
2. trajectoire 2D observée ;
3. biomécanique 2D ;
4. confiance ;
5. explicabilité ;
6. timeline ;
7. observation du résultat ;
8. distance conditionnelle ;
9. highlights observés.

## Sources observées

- Pose : points MoveNet avec confiance par articulation.
- Ballon : modèle spécialisé BasketMotion AI lorsqu’il est configuré, sinon COCO-SSD en fallback.
- Tracking : les points possèdent le drapeau `observed`. Une prédiction courte peut maintenir l’affichage, mais elle ne valide ni relâchement, ni trajectoire, ni résultat.
- Temps : millisecondes relatives à la vidéo ou au début de l’enregistrement.
- Cercle : annotation manuelle autorisée ou modèle de vision validé, avec centre, largeur apparente et confiance.

## Vidéos importées

Une première passe de dix images contrôle la qualité et recherche un signal de tir. Lorsqu’un signal candidat apparaît, une seconde fenêtre analyse jusqu’à trois zones de trois secondes avec un pas de 100 ms, soit au maximum 90 images. Sans candidat, aucune phase n’est inventée.

Cette stratégie limite le coût navigateur. Elle peut manquer un tir très bref entre deux images de la première passe ; cette limite doit être affichée et testée sur des clips autorisés.

## Confiance

`MetricResult` conserve valeur, unité, confiance entre 0 et 1, source, statut et limites. Sous 0,60, `createMetricResult` supprime la valeur, passe le statut à `unavailable` et recommande une nouvelle capture.

La confiance globale du tir combine actuellement :

- pose : 25 % ;
- ballon observé : 30 % ;
- phases temporelles : 30 % ;
- métriques disponibles : 15 %.

Ces pondérations sont des règles moteur versionnées, pas une probabilité médicale ou une précision terrain validée.

## Résultats prudents

- `outcome` reste `unknown` sans au moins trois observations conjointes fiables du ballon et du cercle.
- `made` exige un passage descendant observé dans le cylindre du cercle.
- `missed` exige un passage descendant clairement observé hors du cylindre ; une séquence ambiguë reste `unknown`.
- `shotType` reste `unknown` sans classifieur validé.
- aucune distance en mètres n’est produite sans calibration ;
- aucune rotation du ballon n’est déduite d’une bounding box ;
- aucun point prédit ne devient une observation persistée.

Les highlights regroupent uniquement les événements `observed` d’au moins 0,60 de confiance. La comparaison entre séances ne calcule un écart que si les deux valeurs sont disponibles, partagent la même unité et atteignent chacune 0,60.

## Métadonnées et confidentialité

Les nouvelles analyses doivent conserver les versions moteur/modèles via `AnalysisEngineMetadata`. Les logs ne doivent contenir ni image brute, ni token, ni URL privée permanente. OpenCV reste dans un Worker et les modèles lourds sont chargés à la demande.
