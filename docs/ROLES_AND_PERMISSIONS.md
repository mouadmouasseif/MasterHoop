# Rôles et permissions

Rôles : `super_admin`, `club_admin`, `coach`, `athlete`.

- Super admin : gestion plateforme et clubs. Rôle accordé exclusivement par custom claim serveur.
- Admin club : données de son `clubId` uniquement. Claim serveur `role=club_admin` et `clubId` obligatoire.
- Coach : accès aux athlètes reliés par un document actif `coachAthleteLinks/{coachId}_{athleteId}`.
- Athlète : profil, analyses et confidentialité propres.

Un compte dont `accountStatus` vaut `suspended` est refusé. Pour compatibilité, un ancien profil sans rôle est lu comme athlète actif; cette valeur client ne permet jamais d’obtenir un rôle élevé dans les règles Firebase.

Fonctions centrales : `hasPermission`, `canAccessClub`, `canAccessAthlete`, `canAccessAnalysis`. Les services Firebase vérifient aussi ces fonctions avant la requête, puis les règles refont le contrôle avec les claims et documents serveurs.

Les invitations expirent, restent `pending` jusqu’à acceptation/refus et ne créent pas implicitement un lien coach-athlète. L’athlète doit accepter l’association.
