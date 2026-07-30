# Performance mobile

État actuel : MoveNet Lightning, WebGL TensorFlow.js, détecteur spécialisé optionnel, fallback COCO-SSD et OpenCV en Worker. Vite sépare React, Firebase, TensorFlow et OpenCV en chunks.

Le gestionnaire central charge les modèles à la demande, déduplique les chargements, applique un délai et sait libérer les ressources. Le détecteur de ballon n’est pas préchargé comme critique.

Les profils économie/équilibré/haute précision et `DeviceCapabilities` restent planifiés. Aucun niveau matériel, température ou batterie n’est inventé. Les prochains benchmarks doivent mesurer FPS, temps d’inférence après échauffement, mémoire quand l’API existe, taille des modèles, abandons et erreurs sur appareils réels.
