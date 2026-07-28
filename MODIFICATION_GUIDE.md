# Schéma de modification de MasterHoop

Ce document doit être suivi avant toute correction, évolution ou refactorisation du projet.
L’objectif est de préserver la stabilité de la plateforme, la sécurité des données et la
fiabilité des analyses sportives.

## 1. Flux obligatoire

```text
Besoin
  ↓
Définir le périmètre et le résultat attendu
  ↓
Identifier les fichiers et dépendances concernés
  ↓
Évaluer les risques : interface, données, IA, sécurité, performance
  ↓
Faire une modification petite et ciblée
  ↓
Ajouter ou adapter les tests
  ↓
Vérifier TypeScript, tests, build et comportement visuel
  ↓
Contrôler qu'aucune régression n'a été introduite
  ↓
Documenter le changement
```

Une modification ne doit pas être considérée comme terminée si une étape de contrôle
applicable n’a pas été effectuée.

## 2. Fiche à remplir avant une modification

```md
### Modification

- Objectif :
- Problème utilisateur résolu :
- Comportement actuel :
- Comportement attendu :
- Fichiers concernés :
- Éléments hors périmètre :
- Risques identifiés :
- Tests prévus :
- Méthode de retour arrière :
```

Le périmètre doit rester aussi petit que possible. Une correction ne doit pas devenir
une refonte non demandée.

## 3. Emplacement du code

Respecter la responsabilité de chaque dossier :

| Besoin | Emplacement |
|---|---|
| Écran complet | `src/pages/` |
| Élément visuel réutilisable | `src/components/` |
| Accès Firebase ou service externe | `src/services/` |
| Configuration et logique technique partagée | `src/lib/` |
| État React réutilisable | `src/hooks/` |
| Types partagés | `src/types/` |
| Constantes et données statiques | `src/constants/` |
| Images et ressources | `src/assets/` ou `public/` |
| Règles d’accès aux données | `firestore.rules` et `storage.rules` |

Ne pas placer directement dans un composant une logique Firebase, IA ou métier
complexe pouvant être isolée dans un service.

## 4. Règles générales de code

- Utiliser TypeScript et éviter `any`. Si son utilisation est temporairement
  indispensable, expliquer pourquoi dans un commentaire court.
- Réutiliser les types, composants et services existants avant d’en créer de nouveaux.
- Ne pas créer un second composant ayant la même responsabilité qu’un composant existant.
- Préserver les alias d’import `@/src/...`.
- Garder les composants lisibles et extraire la logique complexe.
- Ne pas mélanger une nouvelle fonctionnalité avec un nettoyage général non nécessaire.
- Ne jamais ajouter de clé API, jeton, mot de passe ou configuration privée au dépôt.
- Ajouter les nouvelles variables dans `.env.example`, sans valeur secrète.
- Prévoir les états de chargement, d’erreur, de résultat vide et de succès.
- Conserver une interface utilisable sur mobile et ordinateur.
- Éviter les appels réseau ou calculs IA inutiles à chaque rendu React.

## 5. Règles selon le type de modification

### Interface

- Respecter les couleurs, espacements et composants visuels existants.
- Vérifier les formats mobile, tablette et ordinateur.
- Vérifier le clavier, le contraste et les libellés accessibles.
- Ne pas supprimer un comportement existant sans décision explicite.
- Tester les écrans avec des données normales, longues et absentes.

### Firebase et données

- Définir ou mettre à jour les types avant d’utiliser une nouvelle structure.
- Maintenir la compatibilité avec les documents déjà enregistrés.
- Vérifier les autorisations dans Firestore et Storage.
- Ne jamais permettre à un utilisateur de lire ou modifier les données privées d’un autre.
- Prévoir les erreurs réseau et les opérations partiellement terminées.
- Éviter les suppressions définitives sans confirmation et stratégie de récupération.

### IA et vision par ordinateur

- Séparer une mesure observée d’une estimation ou d’une recommandation.
- Ne pas présenter une heuristique comme une certitude.
- Associer, lorsque possible, un niveau de confiance au résultat.
- Tester plusieurs angles, distances, éclairages et niveaux de performance matérielle.
- Mesurer l’impact sur la fluidité de la caméra avant d’ajouter un nouveau modèle.
- Conserver un comportement utilisable lorsque Gemini ou un modèle externe est indisponible.
- Faire valider toute recommandation biomécanique importante par une personne qualifiée.

### Authentification et fonctions sociales

- Vérifier l’identité de l’utilisateur côté règles, pas uniquement dans l’interface.
- Empêcher les doublons d’invitations, d’amis, d’équipes ou de résultats.
- Protéger les profils, vidéos et données des joueurs mineurs.
- Prévoir les états bloqué, refusé, annulé et expiré.

## 6. Tests obligatoires

Exécuter les contrôles applicables :

```sh
npm run typecheck
npm test
npm run build
```

Ajouter au minimum :

- un test de non-régression pour chaque correction de bug ;
- des tests de réussite, d’échec et de données vides pour les services ;
- une vérification manuelle des parcours modifiés ;
- un test sur mobile pour tout changement visuel ou lié à la caméra.

Pour une analyse vidéo, documenter également :

- l’appareil et le navigateur ;
- la résolution et la fréquence d’image ;
- les conditions de lumière ;
- la distance et l’angle de la caméra ;
- le résultat attendu et le résultat obtenu.

## 7. Critères de fin

Une modification est terminée seulement si :

- le résultat correspond au besoin défini ;
- aucun secret n’a été ajouté ;
- TypeScript ne signale pas de nouvelle erreur ;
- les tests concernés réussissent ;
- le build de production réussit ;
- les erreurs et états vides sont gérés ;
- l’interface reste correcte sur mobile et ordinateur ;
- les règles Firebase restent sécurisées ;
- aucune fonctionnalité voisine n’est cassée ;
- la documentation a été adaptée si le comportement change.

Si un contrôle ne peut pas être exécuté, le signaler explicitement avec la raison et
le risque restant.

## 8. Format du compte rendu

```md
### Compte rendu

- Résultat :
- Fichiers modifiés :
- Tests ajoutés ou adaptés :
- Vérifications réussies :
- Vérifications non réalisées :
- Risques restants :
- Action recommandée ensuite :
```

## 9. Ordre de priorité

En cas de conflit, appliquer cet ordre :

1. Protection des utilisateurs et de leurs données.
2. Exactitude des analyses et absence de déclarations trompeuses.
3. Stabilité des séances, vidéos et résultats enregistrés.
4. Compatibilité mobile et performance.
5. Simplicité du code et facilité de maintenance.
6. Apparence et fonctionnalités secondaires.
