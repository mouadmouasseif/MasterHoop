# Confidentialité

- Analyses et vidéos privées par défaut.
- Vidéo dans Storage, métadonnées dans Firestore.
- Accès coach seulement après association active consentie.
- Isolation stricte des clubs et refus des comptes suspendus.
- Aucune vidéo, image, annotation, poids privé ou consentement réel dans Git.
- Aucune mise en cache PWA des réponses Firebase Storage privées.
- Les exports locaux doivent être déclenchés par l’utilisateur.

Le pipeline ML exige un manifeste de consentement privé. Le retrait d’un consentement doit permettre de retrouver et supprimer les images dérivées. Les mineurs nécessitent une autorisation adaptée.

Une interface complète de consentement, rétention et suppression sera ajoutée au Sprint 5; les routes actuelles ne prétendent pas fournir ce workflow complet.
