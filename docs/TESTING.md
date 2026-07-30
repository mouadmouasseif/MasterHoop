# Tests

## Commandes

`npm run lint` et `npm run typecheck` exécutent `tsc --noEmit`. `npm run test` exécute Vitest hors tests d’émulateur. `npm run build` produit le bundle Vite et la PWA.

## Résultats au 30 juillet 2026

- Sprints 1–2 : TypeScript réussi ; 10 fichiers et 20 tests unitaires réussis.
- Sprint 3 : TypeScript réussi ; 12 fichiers et 25 tests unitaires réussis en 13,17 s.
- Sprint 4, socle : 17 fichiers et 39 tests unitaires réussis, dont calibration, résultat observé, highlights, comparaison et seuils des clips.
- `npm run test:firebase` : 10 scénarios sur 10 réussis sous Temurin OpenJDK 21.0.12.
- Validation de production Sprint 4 : TypeScript réussi ; Vite a transformé 3 910 modules en 2 min 38 s lors de la passe finale. La PWA a généré `dist/sw.js` et 52 entrées précachées (7 400,64 KiB).
- Build final Sprint 3 : réussi en 290,3 s au total ; Vite a transformé 3 907 modules en 2 min 33 s. La PWA a généré `dist/sw.js` et 52 entrées précachées (7 389,50 KiB).
- Vérification visuelle Sprint 3 : tentative effectuée, mais le serveur de développement n’a pas ouvert le port 3000 dans la fenêtre d’attente locale. Aucune validation visuelle Sprint 3 n’est donc revendiquée. Les routes publiques et redirections avaient été validées au Sprint 2.

Le build conserve des avertissements non bloquants : chunks principal (501,72 kB), Firebase (516,55 kB), TensorFlow (1 818,35 kB) et runtime OpenCV (15 516,04 kB). OpenCV signale aussi l’externalisation navigateur de `fs`/`crypto` et un chunk vide ; ces points restent dans la dette de performance.

## Couverture Sprints 3 et 4

- Timeline de tir complète et résultat conservé à `unknown`.
- Exclusion des points de ballon prédits.
- Blocage des phases et métriques sous 0,60 de confiance.
- Trajectoire 2D et angle de relâchement.
- Biomécanique 2D avec équilibre et timing.
- Transfert de puissance explicitement indisponible.
- Fenêtres d’analyse vidéo denses, bornées et chronologiques.
- Homographie et distances en mètres uniquement après calibration valide.
- Observation `made`/`missed` sur passage descendant conjoint ballon/cercle ; ambiguïté conservée à `unknown`.
- Highlights limités aux événements observés à 0,60 ou plus.
- Comparaison bloquée si valeur, unité ou confiance ne sont pas compatibles.
- Manifestes, licence CC0, provenance et signature WebM des quatre clips synthétiques.
- Seuil faible lumière validé sur les pixels décodés : clip normal ≈ 97, clip faible lumière ≈ 6, pour une limite de production à 55.
- Présence du ballon validée sur 20/20 images du tir complet, 0/20 du clip sans ballon et perte centrale sur 5 images du clip de tracking.

Les fixtures du moteur et les quatre clips vidéo sont synthétiques et marqués comme tels ; ils valident les règles mathématiques, les seuils de garde et la chaîne de fichiers, pas les performances sur terrain ni la qualité d’un modèle de vision.

## Exécuter Firebase

Installer JDK 21+, vérifier `java -version`, puis exécuter `npm run test:firebase`. Aucun compte Firebase réel n’est requis : l’identifiant local est `BasketMotion-Ai-rules-test`. Sur ce poste, le shell doit pointer explicitement `JAVA_HOME` vers `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot` tant que sa session n’a pas été redémarrée.

## Validations terrain restantes

Ajouter des clips réels courts, consentis et redistribuables pour : flou, corps partiel, plusieurs joueurs, caméra instable, tir incomplet et format non supporté. Les seuils biomécaniques et de résultat devront ensuite être revus par un coach qualifié.
