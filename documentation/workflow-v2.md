# Workflow Change Control V2

## Circuit cible

1. **Demandeur** crée et soumet la demande avec ses pièces jointes.
2. **N+1 / signataire** : l’approbateur est résolu à partir de `Utilisateurs.signataire` du demandeur.
3. **Directeur Changement** : contrôle les services impactés et peut ajouter, modifier ou retirer des services.
4. **Évaluation des impacts** : les services obligatoires sont Qualité, Compliance, Réglementaire et Pharmacovigilance (PV), auxquels s’ajoutent les services validés par le Directeur Changement.
5. **DG** : décision finale. Une validation termine le circuit d’approbation ; un refus termine la demande en statut refusé.
6. **Responsable Qualité** : après validation du DG uniquement, crée le Plan d’Action complet.
7. Le Plan d’Action est ensuite recréé dans Qualipro.

## Permissions dédiées

- `approbation.n_plus_un`
- `approbation.directeur_changement`
- `approbation.dg`
- `plan_action.responsable_qualite`

## Principes techniques

- Le schéma SQL existant reste inchangé.
- Les permissions sont ajoutées par script SQL idempotent.
- Les pièces jointes doivent toujours être filtrées par `Piece_jointes.numero_demande`.
- Les notifications sont générées lors des transitions de workflow.
- Les courriels sont d’abord enregistrés dans la table `mailing`, puis envoyés par un worker périodique via Microsoft Graph.
