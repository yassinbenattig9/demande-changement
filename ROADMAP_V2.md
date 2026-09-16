# ROADMAP V2 — Médicis Change Control (Sécurité, Workflow dynamique, Rôles dynamiques)

> Après la Phase 4 (nettoyage mock/contract + code-splitting + session auth HttpOnly), cette V2
> traite les 3 chantiers stratégiques demandés par la Direction Qualité :
> **A. Mots de passe chiffrés**, **B. Circuit de validation 100% configurable**, **C. Rôles dynamiques & sécurité serveur**.

## Principes directeurs

- **Base DCMEDICIS_TEST** : les tables historiques sont **gelées** (aucune structure modifiée).
  Toute nouveauté passe par des **nouvelles tables** (`Roles`, `Permissions`, `Role_Permissions`,
  `Utilisateur_Roles`, `Workflow_*`, `Demande_Workflow`) dans la même base.
- **Migration idempotente** : scripts Node rejouables (`scripts/*.js`), dry-run possible, avec
  rapport par utilisateur/demande. Aucune donnée détruite.
- **Rétro-compatibilité** : le frontend actuel (basé sur `Accees`) continue de fonctionner pendant
  la migration ; le basculement vers les permissions serveur se fait sprint par sprint.
- **Sécurité serveur** : l'autorisation n'est plus décidée uniquement par le client ;
  chaque route écrite vérifie une permission résolue côté serveur (session).

---

## Sprint 1 — Sécurité et rôles : socle serveur (Phase A + Phase C backend)

| Livrable | Contenu |
|---|---|
| A1 | `saveUser` CRÉATION et MISE À JOUR hache tout mot de passe en clair (bcrypt, cost 12). Les mots de passe déjà hachés (`$2b$…`) sont laissés intacts. |
| A2 | Script `scripts/hash-passwords.js` : hache tous les mots de passe en clair de `Utilisateurs` (idempotent, dry-run, rapport). |
| A3 | `authLogin` : suppression du fallback en clair — le mot de passe est TOUJOURS comparé via bcrypt. |
| A4 | Test de connexion réel : `hajer.abid@medicis.tn` doit se connecter normalement après migration. |
| C1 | Nouvelles tables : `Roles`, `Permissions`, `Role_Permissions` (+ `site_code` nullable), `Utilisateur_Roles`. |
| C2 | Script `scripts/migrate-access.js` : convertit le bit-string `Accees` + flags `DirecteurAQ/MemberAQ/Role_user` en rôles/permissions (rapport par utilisateur). `Accees` est conservé mais cesse d'être la source de vérité. |
| C3 | Module `rbac.js` : catalogue des permissions, `resolvePermissions(id_user)` (serveur), middleware `requirePermission(code)` / `requireAnyPermission(codes)` → 403. |
| C4 | Annotation RBAC de `routes.js` (toutes les routes d'écriture) + `GET /auth/me` renvoie la liste des permissions résolues (et non un bit-string). |

## Sprint 2 — Moteur de workflow dynamique (Phase B)

| Livrable | Contenu |
|---|---|
| B1 | Nouvelles tables : `Workflow_Config`, `Workflow_Version` (`brouillon` / `publiée`), `Workflow_Etape` (`mode`: `sequence` | `parallele` ; `strategie`: `tous` | `au_moins_un` | `majorite` ; `min_decisions`), `Workflow_Etape_Approbateur` (`type` : `role` | `fonction` | `email` | `service`), `Demande_Workflow` (snapshot du workflow au moment de la création, par `numero_demande`). |
| B2 | Migration des états : la chaîne `etat_demande` actuelle est remplacée par des **codes d'étape**. Mapping défini : `demande_éditée → etape_submission`, `acceptation_responsable_service → etape_validation_service`, `approbation_directeur_qualité → etape_validation_qualite`, `approbation_PRT → etape_validation_prt`, `Impact défini → etape_impact`, `en cours… → etape_implementation`, `clôturée_validée → etape_cloturee`, `refusée → etape_refusee`, `demande_incomplète → etape_incomplete`. Les demandes existantes sont rejouées via la table de mapping. |
| B3 | *Par défaut* : les 4 approbations valident **en parallèle** (« tous » doivent valider). Reconfigurable dans la base + UI admin (`/admin/workflow`) : séquence stricte 1→2→3→4, groupes parallèles, 5 services, stratégie majorité… |
| B4 | Réécriture de `submitApproval` : évaluation réelle « tous / au moins un / majorité » sur les en-têtes d'approbation **multi-lignes** de l'étape courante (`Approbation` accepte déjà plusieurs lignes par `(numero_demande, type_approbation)` — pas de contrainte unique). |
| B5 | Page admin `/admin/workflow` (builder) : créer → brouillon → publier ; version courante appliquée aux nouvelles demandes. |
| B6 | Frontend : file d'attente « À approuver » + timeline de la demande pilotées par la config (plus de libellés en dur). |

## Sprint 3 — Bascule UI et rôles frontend

| Livrable | Contenu |
|---|---|
| C5 | `parseAccees` (client) retiré de tout usage runtime ; le store d'authentification utilise les permissions renvoyées par `/auth/me`. |
| C6 | Page admin `/admin/roles` : assignation des rôles aux utilisateurs (CRUD `Utilisateur_Roles` + `Role_Permissions`). |
| C7 | Filtrage de la sidebar + des onglets 100 % piloté par les permissions serveur. |
| B5b | Builder `/admin/workflow` branché sur l'API `Workflow_*` (config publiée lue par le frontend). |

## Sprint 4 — Vérification finale

| Livrable | Contenu |
|---|---|
| V1 | `tsc --noEmit` + `npm run build` (frontend), démarrage backend sans erreur. |
| V2 | Smoke tests réels : connexion, création de demande, approbation en parallèle, refus, migration d'une ancienne demande. |
| V3 | Tests Négatifs RBAC : utilisateur sans permission → 403 sur la route écrite. |
| V4 | RAZ des lignes de test (`historique` puis `Demande`) ; rapport de fin de migration archivé. |

---

## Catalogue des permissions (Phase C)

Extrait du mapping `Accees` → permissions (définition complète dans `backend/src/rbac.js`).

| Position `Accees` | Permission | Module |
|---|---|---|
| 0 | `acces.base` | Portail |
| 1 | `demande.creer` | Demandes |
| 2 | `approbation.responsable_service` | Approbations |
| 3 | `approbation.charge_changement` | Approbations |
| 4 | `approbation.responsable_changement` | Approbations |
| 5 | `approbation.prt` | Approbations |
| 6 | `consultation` | Demandes |
| 7 | `plan_action` | Plan d'actions |
| 8 | `evaluation_cloture` | Clôture |
| 9 | `reunions` | Réunions |
| 10 | `parametrage_mailing` | Mailing |
| 11 | `parametrages` | Paramétrage |
| 13 | `admin.utilisateurs` | Administration |
| 14 | `avis_services` | Avis services |
| 15 | `historique` | Audit |
| 18 (2/3/4) | `role.compliance` / `role.reglementaire` / `role.pharmacovigilance` | Rôles spéciaux |
| flags | `qa.directeur`, `qa.membre`, `approbation.directeur_qualite` | Qualité |
| sites 16-21 | `site.charge`, `site.responsable`, `site.plan_action`, `site.cloture`, `site.validation_prt` — l'accès site est porté par `Role_Permissions.site_code` | Sites |

## État d'avancement

| Sprint | Statut |
|---|---|
| 1 — Sécurité & rôles (A + C backend) | ✅ terminé (A1-A4, C1-C4 appliqués et vérifiés) |
| 2 — Moteur workflow (B) | ✅ terminé (B1-B4 + routes admin vérifiés : 17/17 smoke + admin services) |
| 3 — Bascule UI / rôles frontend | ✅ terminé (RolesAdminPage, ApprovalQueuePage, WorkflowAdminPage ; tsc + build OK) |
| 4 — Vérification finale | ✅ terminé (backend régénéré, smoke intégral 23/23, port 4000 vérifié) |

Notes d'implémentation (Phase B) :
- Les libellés legacy restent dans `etat_demande` (les filtres frontend s'y appuient) ; le moteur suit
  l'étape réelle dans `Demande_Workflow.etape_courante` (`getStageForDemande` auto-répare).
- Nouvelles demandes : l'étape `etape_validation` (4 approbateurs), visible d'office, est ouverte à la
  création — la « soumission » affichée restant `demande_éditée`.
- Par défaut : parallèle « tous » (4 approbateurs) puis PRT (`approbation.prt`), reconfigurable via
  `/admin/workflow` (brouillon → publier), appliqué aux nouvelles demandes.

Détail des décisions validées : voir `documentation_recreation/*.md` + audit de l'existant (ROADMAP.md Phases 1-4).