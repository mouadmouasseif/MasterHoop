# Migration vers l’IA personnalisée BasketMotion-Ai

## État actuel

Le calcul des analyses utilise désormais `personalizedAIService`, un moteur local
explicable qui fonctionne sans Gemini.

La première version :

- calcule les scores uniquement à partir des mesures disponibles ;
- associe une confiance à chaque métrique ;
- bloque les diagnostics lorsque la confiance globale est inférieure à 60 % ;
- enregistre le moteur, la confiance et les limites avec la séance ;
- ne fabrique plus de résultat à partir du nom d’une vidéo ;
- produit des recommandations déterministes et testables.

## Contrôle vidéo maintenant disponible

L’import principal échantillonne dix images réparties dans la vidéo. Il mesure la
résolution, la luminosité, le contraste, la netteté et le taux de détection de la
posture et du ballon. Une vidéo dont la qualité est insuffisante peut être prévisualisée,
mais elle n’est pas enregistrée comme une analyse fiable.

Les images échantillonnées passent réellement dans les modèles navigateur MoveNet et
COCO-SSD. Les métriques observées sont agrégées puis transmises au moteur local et
enregistrées avec la séance.

## Prétraitement OpenCV

OpenCV.js est chargé dynamiquement uniquement lorsqu’une vidéo doit être analysée.
Chaque image échantillonnée reçoit désormais :

- une amélioration locale du contraste avec CLAHE ;
- une mesure de netteté fondée sur le Laplacien ;
- une estimation du mouvement de caméra ;
- une tentative de stabilisation ECC avant l’analyse TensorFlow.

Ces opérations s’exécutent dans un Web Worker dédié. Les pixels sont transférés au
worker sans copie supplémentaire lorsque le navigateur le permet, puis l’image
prétraitée revient vers le pipeline TensorFlow. Le worker possède un délai maximal,
libère ses matrices OpenCV après chaque image et est arrêté à la fin de l’analyse.

Si OpenCV ne peut pas être chargé, le contrôle Canvas reste disponible et le rapport
indique explicitement le moteur de prétraitement utilisé. Le module OpenCV n’est pas
précaché par la PWA en raison de sa taille ; il est téléchargé au premier besoin puis
conservé dans un cache d’exécution limité.

## Limites

Le module OpenCV représente environ 15,5 Mo avant compression et environ 3,9 Mo
compressé. Son premier chargement peut donc être lent sur une connexion mobile.
La stabilisation légère entre les images échantillonnées ne remplace pas encore une
stabilisation continue image par image.

## Modèle spécialisé de ballon

Le pipeline accepte désormais un modèle TensorFlow.js GraphModel spécialisé grâce à
la variable `VITE_BALL_MODEL_URL`. Si cette variable est absente ou si le modèle ne
se charge pas, COCO-SSD est utilisé automatiquement.

Le premier format pris en charge est :

```text
Entrée : image RGB normalisée, généralement 640 × 640
Sortie : [1, N, 6] ou [1, 6, N]
Valeurs : x1, y1, x2, y2, confiance, classe
Classe 0 : ballon de basketball
```

Les sorties YOLO à une classe au format `centreX, centreY, largeur, hauteur,
confiance` sont également acceptées. Le post-traitement applique un seuil de
confiance, une suppression des boîtes superposées, un contrôle de taille, la
continuité temporelle et une préférence pour les détections proches des poignets.

Le rapport conserve la confiance du ballon et indique si la détection vient du modèle
BasketMotion-Ai ou du repli COCO-SSD.
Les scores sont des règles BasketMotion-Ai initiales et doivent être calibrés avec un coach
et un jeu de données représentatif.

## Prochaines étapes

1. Ajouter une stabilisation continue et la calibration de caméra.
2. Collecter et annoter les images de ballon avec consentement.
3. Entraîner puis exporter le premier modèle spécialisé TensorFlow.js.
4. Mesurer la confiance à partir des points de posture et du suivi temporel.
5. Entraîner et comparer un premier classificateur de phases du tir.
6. Faire valider les seuils et recommandations par un coach qualifié.
