# Biomécanique 2D

## Mesures livrées au Sprint 3

### Équilibre projeté

Pour chaque image où les deux hanches et les deux chevilles sont visibles :

```text
centre_bassin = milieu(hanche_gauche, hanche_droite)
centre_appuis = milieu(cheville_gauche, cheville_droite)
équilibre_2D = |x_bassin - x_appuis| / largeur_appuis
```

La valeur est un ratio de largeur d’appuis (`stance_width_ratio`). Une valeur faible signifie seulement que le bassin projeté reste près du centre des appuis dans le plan image. Elle ne mesure ni force, ni pression plantaire, ni équilibre 3D.

### Timing

Le timing est la différence, en millisecondes, entre la première phase de préparation suffisamment fiable et le relâchement observé. La précision est limitée par la fréquence d’analyse des images.

### Stabilité après atterrissage

Lorsque l’atterrissage est détecté, la stabilité est décrite par l’étendue horizontale du centre du bassin sur les cinq premières images disponibles :

```text
stabilité_2D = max(x_bassin_normalisé) - min(x_bassin_normalisé)
```

Cette mesure est un signal technique 2D. Elle ne mesure pas la force d’impact et ne prédit pas un risque de blessure.

## Valeurs volontairement indisponibles

- efficacité globale : définition non validée pour les signaux actuels ;
- transfert de puissance : impossible à mesurer avec une pose 2D seule ;
- centre de masse 3D ;
- valgus diagnostique ;
- force, charge articulaire ou risque de blessure.

## Confiance et formulation

Chaque métrique utilise `MetricResult`. Sous 0,60, sa valeur devient `null` et son statut `unavailable`. Les textes utilisent « observation technique », « signal de mouvement » ou « estimation 2D ». BasketMotion AI ne produit aucun diagnostic médical, aucune prescription et aucune prédiction certaine de blessure.

## Validation nécessaire

Les seuils d’interprétation doivent être confrontés à des clips consentis, filmés sous plusieurs angles, puis revus par un coach qualifié. Aucun seuil clinique n’est défini.
