# Calibration du terrain

## Socle Sprint 4

`CourtCalibration` calcule une homographie image → terrain à partir d’au moins quatre correspondances connues. Chaque repère conserve sa position en pixels, sa position terrain en mètres, sa confiance et sa source (`manual_reference` ou `validated_vision_model`).

La calibration n’est déclarée `calibrated` que si :

- quatre points image et terrain distincts sont disponibles ;
- les points couvrent une surface suffisante et ne sont pas presque alignés ;
- chaque repère atteint 0,60 de confiance ;
- l’erreur de reprojection reste au plus à 8 pixels ;
- la confiance globale atteint 0,60.

Le résultat conserve l’identifiant stable de calibration, l’homographie, la résolution, la couverture, l’erreur de reprojection, la confiance et les limites.

## Distances

Une distance de tir en mètres exige simultanément :

- une calibration valide ;
- la position du panier au sol dans le repère terrain ;
- les chevilles visibles au relâchement.

Sinon `shotDistance` vaut `unavailable`. Une calibration entre 0,60 et 0,75 produit une estimation ; au-dessus, la mesure est marquée `measured`. Une distance projetée supérieure à 40 m est rejetée.

## Limites actuelles

Le socle mathématique et ses tests sont livrés, mais l’assistant de saisie des repères dans la caméra n’est pas encore finalisé. La calibration doit être recalculée si la caméra bouge. Les vitesses en m/s, l’angle d’entrée 3D et la profondeur du tir restent indisponibles.

Une position de panier utilisée uniquement comme overlay n’est pas une détection et ne permet jamais de conclure automatiquement `made` ou `missed`.
