# Détecteur de ballon MasterHoop

Ce dossier contient la chaîne reproductible de préparation, entraînement, export et
évaluation du modèle spécialisé. Les vidéos, images, annotations, poids et exports
sont privés et exclus de Git.

## Conditions avant entraînement

- Chaque vidéo doit être déclarée dans un manifeste de consentement privé.
- Une vidéo contenant un mineur ne doit pas être utilisée sans autorisation adaptée.
- Les personnes qui annotent ne doivent recevoir que les données nécessaires.
- La suppression d’un consentement doit permettre de retrouver et retirer toutes les
  images dérivées de la vidéo.
- Les vidéos d’une même séance doivent rester dans un seul ensemble : entraînement,
  validation ou test.

## Environnement

Créer un environnement Python isolé, puis installer :

```text
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
```

L’environnement Python actuellement fourni avec le projet ne contient pas OpenCV ni
Ultralytics. Aucun entraînement ne peut donc être lancé avant cette installation.

## Étapes

### 1. Consentement

Copier `consent.example.json` vers un emplacement privé exclu de Git, puis déclarer
chaque vidéo autorisée.

### 2. Extraction

```text
python prepare_dataset.py \
  --videos chemin/vers/videos \
  --consent chemin/prive/consent.json \
  --fps 2
```

Les fichiers utilisent le format :

```text
identifiant-video__frame-0000120.jpg
```

Cette convention permet de séparer les données par vidéo et non image par image.

### 3. Annotation

Annoter uniquement le ballon au format YOLO :

```text
classe centre_x centre_y largeur hauteur
0 0.52 0.41 0.07 0.09
```

Toutes les coordonnées sont normalisées entre 0 et 1. Les images sans ballon doivent
avoir un fichier d’annotation vide afin d’apprendre les vrais négatifs.

### 4. Découpage et validation

```text
python split_dataset.py
python validate_dataset.py
```

La répartition déterministe est de 70 % entraînement, 15 % validation et 15 % test,
par vidéo complète.

### 5. Entraînement

```text
python train.py --base-model yolo11n.pt --epochs 80 --image-size 640
```

Ne pas sélectionner le modèle final sur les résultats du dossier `test`. Celui-ci
sert uniquement à la comparaison finale.

### 6. Export web

```text
python export_tfjs.py
```

Copier le dossier exporté dans `public/models/basketball/`, puis configurer :

```text
VITE_BALL_MODEL_URL=/models/basketball/model.json
```

Le convertisseur TensorFlow.js produit un `model.json` et des fichiers de poids
fragmentés. Vérifier les opérations supportées et la forme de sortie avant déploiement.

### 7. Comparaison

Les prédictions des deux moteurs doivent être exportées sous cette forme :

```json
{
  "identifiant-image": [
    {
      "bbox": [0.52, 0.41, 0.07, 0.09],
      "score": 0.91
    }
  ]
}
```

Puis exécuter :

```text
python evaluate_predictions.py \
  --specialized predictions-masterhoop.json \
  --coco predictions-coco.json
```

Le rapport compare précision, rappel et F1 au même seuil de confiance et au même IoU.

## Critères minimaux proposés

- rappel supérieur à COCO-SSD sur le jeu de test ;
- précision au moins égale à COCO-SSD ;
- F1 supérieur d’au moins 10 % ;
- aucune régression importante sur les vidéos sombres ou les petits ballons ;
- temps d’inférence mobile mesuré après échauffement ;
- modèle final testé sur des joueurs, terrains et téléphones absents du train.
