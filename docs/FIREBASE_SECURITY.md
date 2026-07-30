# Sécurité Firebase

## Claims requis

Les rôles élevés doivent être définis par Admin SDK ou Cloud Functions :

```json
{ "role": "coach", "accountStatus": "active", "clubId": "club-a" }
```

Ne jamais permettre au navigateur de créer ces claims. Après modification, forcer le renouvellement du token Firebase.

## Collections d’accès

- `coachAthleteLinks/{coachId}_{athleteId}` : `coachId`, `athleteId`, `clubId`, `status`.
- `invitations/{id}` : type, expéditeur, destinataire, club/coach, statut et expiration.
- `analyses/{id}` : `ownerId`, `athleteId`, `clubId`, statut et métadonnées moteur.
- `modelRegistry` : lecture authentifiée, écriture super-admin.
- `auditLogs` : aucune écriture frontend et lecture super-admin.

Les anciens documents avec `userId` restent lisibles grâce à `ownerOf`. Toute nouvelle écriture doit préférer `ownerId` et `athleteId`.

## Storage

Chemins privés : `users/{athleteId}/sessions/...` et `analyses/{athleteId}/{analysisId}/...`. Les uploads exigent un propriétaire dans les métadonnées, un MIME autorisé et une taille maximale. Les mises à jour de fichier en place sont refusées; il faut créer une nouvelle version ou supprimer puis recréer avec autorisation.

## Validation

`npm run test:firebase` couvre 10 scénarios : propriétaire, coach associé/non associé, isolation club, suspension, propriétaire immuable, invitation expirée, champs de revue coach autorisés sans changement de statut, MIME invalide et métadonnées Storage dont le propriétaire ne correspond pas au chemin. Les 10 scénarios passent localement sous Temurin JDK 21.0.12 ; voir `docs/TESTING.md`.
