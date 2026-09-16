# TEST_CASES.md — Medicis Change Control (API Backend)

Fiche de recette exhaustive de l'API REST. Chaque cas correspond à **une requête de la collection Postman**
(`postman/Medicis-Change-Control.postman_collection.json`).

## Mode d'emploi

1. Démarrer le backend :
   ```powershell
   cd "C:\Users\yassine.atig\Desktop\Node React projects\demande changement\backend"
   npm start        # node src/index.js → http://localhost:4000/api
   ```
2. Importer la collection dans Postman (option « Import » → fichier JSON).
3. Renseigner les **variables de collection** (onglet Variables) avant exécution :
   | Variable | Valeur d'exemple | Note |
   |---|---|---|
   | `baseUrl` | `http://localhost:4000` | Ne pas mettre `/api` |
   | `email` / `password` | `hajer.abid@medicis.tn` / `Hajer123**` | Compte de test standard |
   | `adminEmail` / `adminPassword` | *à renseigner* | Compte disposant des perms `parametrages` + `admin.utilisateurs` |
   | `approbateurEmail` | `aicha.mrad@medicis.tn` | Email d'un approbateur réel (voir `/api/users/approbateurs`) |
   | `impactService` / `impactEmail` | ex. `Assurance Qualité` / email du service | Utilisés par le PUT impact |
   | `site` | `SS` | Site par défaut (JO/EF/SS) |
   | `roleCode` / `adminUserRowid` | *à renseigner* | Rôle cible pour les tests RBAC |
4. Lancer la collection **dans l'ordre des dossiers 00 → 17** (Runner ou manuellement un dossier à la fois).
   Les variables `numero_demande`, `chrono`, `userId`, `planId`, `mailingId`, `tabId`, `notifId`,
   `workflowId`, `versionId` sont remplies automatiquement par les tests des requêtes de création.
5. Pour chaque ligne ci-dessous, noter dans la colonne **O/N** :
   - **O** = le comportement observé correspond à `Attendu` ;
   - **N** = échec → décrire dans **Commentaire** ce qui s'est réellement passé (statut HTTP, message d'erreur,
     stack…).
6. Nettoyage : la demande de test créée n'a pas d'endpoint de suppression ; elle reste en base (statut normal).
   Le dossier **17 — Teardown** referme la session (logout). Le `PUT /api/serveur` étant destructif, le
   **restaurer** avec l'ancienne valeur lue en début de test.

> ⚠️ Les tests **admin** basculent la session sur le compte `adminEmail` (dossier 15) puis la restaurent
> sur `hajer` (dossier 17). Ne pas interrompre entre ces dossiers.

---

## Récapitulatif

| Dossier | Nombre de cas | OK | Échec | Statut |
|---|---|---|---|---|
| 00 — Guards & Ping | 3 | 3 | 0 | ☐ |
| 01 — Auth | 4 | 4 | 0 | ☐ |
| 02 — Demandes | 10 | 10 | 0 | ☐ |
| 03 — Sujets | 2 | 2 | 0 | ☐ |
| 04 — Approbations & Workflow | 9 | | | ☐ |
| 05 — Impacts | 4 | | | ☐ |
| 06 — Plans d'action | 4 | | | ☐ |
| 07 — Réunions | 2 | | | ☐ |
| 08 — Diffusions | 3 | | | ☐ |
| 09 — Mailing | 3 | | | ☐ |
| 10 — Historique | 2 | | | ☐ |
| 11 — Utilisateurs | 7 | | | ☐ |
| 12 — Notifications | 2 | | | ☐ |
| 13 — Référentiels | 6 | | | ☐ |
| 14 — Serveur & PJ & Stats | 4 | | | ☐ |
| 15 — Admin Workflow | 8 | | | ☐ |
| 16 — Admin RBAC | 4 | | | ☐ |
| 17 — Teardown | 3 | | | ☐ |
| **TOTAL** | **80** | | | ☐ |

---

## 00 — Guards & Ping

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 1 | `GET /api/ping` (sans session) | HTTP 200, corps `{"message":"pong", ...}` | o | |
| 2 | `GET /api/demandes` **sans session** | HTTP 401, corps `{"error":"Non authentifié"}` | o | |
| 3 | `GET /api/route-inexistante` | HTTP 404, corps `{"error":"Route inconnue : GET /api/route-inexistante"}` | o | |

## 01 — Auth

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 4 | `POST /api/auth/login` avec hajer | HTTP 200, `success:true`, `user.email=hajer.abid@medicis.tn`, `permissions` = tableau non vide, `roles` + `siteAccess` présents | o| |
| 5 | `POST /api/auth/login` mauvais mot de passe | HTTP 401, `{"error":"Email ou mot de passe incorrect"}` | o| |
| 6 | `POST /api/auth/login` email inconnu | HTTP 401 (même message) | o | |
| 7 | `GET /api/auth/me` (session active) | HTTP 200, `user` non nul, **aucun champ `password`**, `permissions`/`roles`/`siteAccess` présents | o | |

> Cas supplémentaire (visible dans le dossier 17) : `GET /api/auth/me` sans session → HTTP 200, `user:null`.

## 02 — Demandes

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 8 | `GET /api/demandes` | HTTP 200, tableau (tri par `numero_demande` DESC) | o | |
| 9 | `GET /api/demandes?search=qualité` | HTTP 200, tableau filtré (numero_chronologique / designation / sujet_changement / demandeur) | o | |
| 10 | `GET /api/demandes?statut=demande_éditée` | HTTP 200, tableau filtré sur `etat_demande` (LIKE) | o | |
| 11 | `GET /api/demandes?service=Qualité` | HTTP 200, tableau filtré sur `service_demandeur` | o | |
| 12 | `GET /api/demandes?type=Modification procédure` | HTTP 200, égalité stricte sur `type_changement` | o | |
| 13 | `GET /api/demandes?site=SS` | HTTP 200, tableau filtré sur `site` | o | |
| 14 | `GET /api/demandes?classement=Standard` | HTTP 200, tableau filtré sur `classement_changement` | o | |
| 15 | `POST /api/demandes` (création) | HTTP 201 ; corps = demande complète ; `numero_demande` > 0 ; `numero_chronologique` = `YY/NNN` ; `etat_demande` = `demande_éditée` ; favorte `numero_demande` **et** `chrono` en variables | o | |
| 16 | `GET /api/demandes/{numero_demande}` | HTTP 200, même demande (avec `nom_demandeur`/`lower_demandeur` dérivés) | o | |
| 17 | `GET /api/demandes/99999999` | HTTP 404, `{"error":"Demande introuvable"}` | o | |

### Détails sur la création (contrôles d'impact) — à vérifier en BDD ou via les GET suivants

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 15b | Après création, la ligne `Demande_Workflow` existe | `etape_courante = etape_validation`, `statut_decision = NULL` | o | |
| 15c | Après création, `Service_impactees` est peuplé (seed depuis `Approb_Fonction`) | ≥ 1 ligne avec `numero_demande` = la nouvelle demande | | |
| 15d | Après création, une entrée `historique` « création » existe | Filtre `GET /api/historique?numero_chronologique={chrono}` (voir dossier 10) doit la contenir | | |
| 15e | Le `numero_chronologique` est unique et croissant | Redemander avec la valeur précédente de `chrono` : nouvelle valeur = incrément | | |

## 03 — Sujets

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 18 | `POST /api/demandes/{id}/sujets` | HTTP 200 ; réponse = sujet créé (avec `ROWID`) ; variable `sujetRowid` définie | o | |
| 19 | `GET /api/demandes/{id}/sujets` | HTTP 200 ; le sujet ajouté est présent (ordre par `ROWID`) | o | |

## 04 — Approbations & Workflow (décisions)

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 20 | `GET /api/approbations/en-attente` | HTTP 200 ; tableau d'objets `{etape, approbation:{numero_demande, type_approbation, email_approbant, ...}}` ; notre demande apparaît | o | |
| 21 | `GET /api/workflow/current` | HTTP 200 ; version **publiée** avec `etapes` (≥ 1, typiquement 6) incluant `etape_validation` (4 approbateurs, `strategie:'tous'`) | o | |
| 22 | `PUT /api/demandes/{id}/approbations/acceptation_responsable_service` | HTTP 200 ; `success:true` ; `nouvelleApprobation` remplie | o | |
| 23 | `PUT /api/demandes/{id}/approbations/acceptation_chargé_changement` | HTTP 200 ; `success:true` | o | |
| 24 | `PUT /api/demandes/{id}/approbations/acceptation_responsable_changement` | HTTP 200 ; `success:true` | o | |
| 25 | `PUT /api/demandes/{id}/approbations/approbation_directeur_qualité` | HTTP 200 ; `success:true` | o | |
| 25b | `PUT …/approbations/acceptation_responsable_service` **une 2e fois** (même email + type) | HTTP 409, `{"error":"Cet approbateur a déjà donné sa décision pour cette étape."}` — anti-spam | | |
| 26 | `PUT …/approbations/acceptation_responsable_service` avec `markIncomplete:true` | HTTP 200 ; `success:false` ; message contenant « incompl » ; la demande passe `etape_incomplete`/`demande_incomplète` | o | |
| 27 | `GET /api/demandes/{id}/approbations` | HTTP 200 ; historique des décisions (lignes ajoutées par 22-25) triées par `numero_approbation` | o |

### Scénarios métier supplémentaires (à reproduire si nécessaire)

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 28 | Refus d'une approbation (`decision:'refusée'`) | HTTP 200 ; succès ; pas de sortie tant que la stratégie n'est pas satisfaite | o | |
| 29 | Avancement « tous » : tous les emails éligibles décident « valide » | Transmission d'étape : `etape_validation` → … → `etape_impact`, `etat_demande` = `Demande de changement Impact défini` | o | |
| 30 | Décision sur une étape déjà terminée / type inconnu | HTTP 200 avec un message explicite (`success` false ou avertissement), pas de crash | o | |

## 05 — Impacts (services impactés)

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 31 | `GET /api/demandes/{id}/impacts` | HTTP 200 ; contient le seed initial (services impactés) | o | |
| 32 | `POST /api/demandes/{id}/impacts` | HTTP 200 ; nouvel impact inséré (colonne `email_cancernee` normalisée minuscules) | o | |
| 33 | `PUT /api/demandes/{id}/impacts/{service}/{email}` | HTTP 200 ; impact mis à jour (`reponse`,`commentaire`,…) | o | |
| 34 | `PUT …/impacts/SERVICE INCONNU/inexistant@medicis.tn` | HTTP 404, `{"error":"Impact introuvable"}` | o | |

## 06 — Plans d'action

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 35 | `GET /api/demandes/{id}/plans` | HTTP 200 ; tableau (vide au début) | o | |
| 36 | `POST /api/plans` | HTTP 200 ; plan créé (mapping : `action_description→Actions`, `responsable→email_utilisateur`, `action_qualipro→action_chronologique`) ; `planId` défini | o | |
| 37 | `PUT /api/plans/{planId}` | HTTP 200 ; plan mis à jour (mappages inverses) | o | |
| 38 | `PUT /api/plans/99999999` | HTTP 200 (aucune ligne affectée — comportement actuel, à documenter) | o | |

## 07 — Réunions

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 39 | `GET /api/reunions` | HTTP 200 ; tableau trié par `rowid` DESC | o | |
| 40 | `POST /api/reunions` | HTTP 200 ; réunion créée (mapping : `participants→createur`, `ordre_du_jour→titre_reunion`, `date_reunion→date`) | o | |

## 08 — Diffusions

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 41 | `GET /api/diffusions` | HTTP 200 ; tableau trié par `ROWID` DESC | o | |
| 42 | `POST /api/diffusions` | HTTP 200 ; diffusion créée (`Num_Dem`, `Email` normalisé) | o | |
| 42b | `GET /api/demandes/{id}/diffusions` | HTTP 200 ; la diffusion de l'étape 42 est présente | o | |

## 09 — Mailing

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 43 | `GET /api/mailings` | HTTP 200 ; tableau | o | |
| 44 | `POST /api/mailings` | HTTP 200 ; mailing créé (`numero_chronologique` + `etat_demande` rapatriés depuis `Demande` si non fournis) ; `mailingId` défini | o | |
| 45 | `PUT /api/mailings/{mailingId}` | HTTP 200 ; mailing mis à jour | o | |

## 10 — Historique / Audit

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 46 | `GET /api/historique` | HTTP 200 ; TOP 500 lignes d'audit | o | |
| 47 | `GET /api/historique?numero_chronologique={chrono}` | HTTP 200 ; contient l'entrée « création » de la demande de test | o  | |

## 11 — Utilisateurs

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 48 | `GET /api/users` | HTTP 200 ; TOP 500 utilisateurs, **sans champ `password`** | o | |
| 49 | `GET /api/users?q=hajer` | HTTP 200 ; recherche libre (email/prenom/nom/service/NomPrenom) | o | |
| 50 | `GET /api/users?email=hajer.abid@medicis.tn` | HTTP 200 ; exactement 1 utilisateur (filtre strict) | o | |
| 51 | `GET /api/users/approbateurs` | HTTP 200 ; utilisateurs avec permission d'approbation OU `Approb_Fonction` de type Approbateur, sans `password` | o | |
| 52 | `POST /api/users` | HTTP 201 ; utilisateur créé (mot de passe hashé bcrypt), rôle individuel `user_{rowid}` créé avec `demande.creer` + `consultation`, liaison `Utilisateur_Roles` ; `userId` défini | o | |
| 53 | `PUT /api/users/{userId}` | HTTP 200 ; champs mis à jour (y compris `DirecteurAQ`/`MemberAQ` booléens → `'1'/'0'`) | o | |
| 54 | `PUT /api/users/99999999` | HTTP 404, `{"error":"Utilisateur introuvable"}` | o | |

## 12 — Notifications

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 55 | `GET /api/notifications/{email}` | HTTP 200 ; TOP 8 notifications **non lues** (`etat_lecture='0'`) ; `notifId` défini si réponse non vide | o | |
| 56 | `PUT /api/notifications/{rowid}/read` | HTTP 200 ; `{"success":true}` ; la notification passe `etat_lecture='1'` | o | |

> Si `notifId` n'a pas été défini automatiquement (table vide), le renseigner manuellement depuis la réponse du GET 55.

## 13 — Référentiels

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 57 | `GET /api/products` | HTTP 200 ; liste `{code, designation}` (paramètre `produit`) | o | |
| 58 | `GET /api/tab-divers` | HTTP 200 ; toutes les lignes `Tab_Divers` | o | |
| 59 | `GET /api/tab-divers?parametre=site` | HTTP 200 ; lignes dont `parametre='site'` | o | |
| 60 | `GET /api/tab-divers?parametre=type` | HTTP 200 ; lignes dont `parametre='type'` | o | |
| 61 | `POST /api/tab-divers` | HTTP 200 ; ligne ajoutée ; `tabId` défini | o | |
| 62 | `DELETE /api/tab-divers/{tabId}` | HTTP 200 ; `{"success":true}` ; la ligne a disparu du GET 58 | o | |

## 14 — Serveur & Pièces jointes & Stats

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 63 | `GET /api/serveur` | HTTP 200 ; `{"Serv":"…"}` | o | |
| 64 | `PUT /api/serveur` | HTTP 200 ; nouvelle valeur `Serv` persistée (**→ restaurer** après test) | o | |
| 65 | `GET /api/pieces-jointes` | HTTP 200 ; tableau (vide ou fichiers, jamais de crash si table sans `fichier`) | o | ✅ Corrigé : la requête utilisait `ROWID` (inexistant) → `rowid` |
| 66 | `GET /api/stats/dashboard` | HTTP 200 ; `DashboardStats` : `totalDemandes`, `enAttenteApprobation`, `enCoursExecution`, `clotureesValidees`, `enRetardCount`, `tauxRespectDelaiPct`, `délaiMoyenJours`, `repartitionParStatut`, `evolutionMensuelle` (12 mois) | o | |

## 15 — Admin Workflow (RBAC : parametrages)

> Ces tests exigent un compte administrateur. Le premier cas vérifie que **hajer** (dépourvu du droit)
> est bien refusé, puis la collection bascule sur `adminEmail`.

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 67 | `GET /api/admin/workflow` en session **hajer** | HTTP 403 | o | |
| 68 | `GET /api/admin/roles` en session **hajer** | HTTP 403 | o | |
| 69 | `POST /api/auth/login` avec `adminEmail` | HTTP 200 (session basculée sur admin) | | |
| 70 | `GET /api/admin/workflow` en session **admin** | HTTP 200 ; `{ configs: [...], permissions: [...] }` ; `workflowId` défini (1er config) | o | |
| 71 | `GET /api/admin/workflow/versions/2` | HTTP 200 ; détail de la version publiée (étapes + approbateurs) ; `versionId=2` | o | |
| 72 | `POST /api/admin/workflow/{workflowId}/versions` | HTTP 201 ; nouveau brouillon créé ; `versionId` défini sur le brouillon | o | |
| 73 | `POST …/versions/{versionId}/publish` | HTTP 200 ; la version brouillon devient **publiée** (l'ancienne publiée est désactivée) | o | ✅ Corrigé : le paramètre `@idv` n'était pas lié → lié |
| 74 | `PUT …/versions/{versionId}/etapes/etape_validation` | HTTP 200 ; approbateurs + stratégie de l'étape mis à jour (brouillon) | o | |

> ⚠️ Après le **publish** (73), les nouvelles demandes utilisent ce brouillon. Pour ne pas perturber les tests,
> re-publier la version de référence (dossier 73) avec l'ancienne version si nécessaire.

## 16 — Admin RBAC (admin.utilisateurs)

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 75 | `GET /api/admin/roles` | HTTP 200 ; `{ roles: [...], permissions: [...] }` | o | |
| 76 | `GET /api/admin/users/{adminUserRowid}/roles` | HTTP 200 ; rôles de l'utilisateur (`Utilisateur_Roles` résolus en codes + libellés) | o | |
| 77 | `PUT /api/admin/users/{adminUserRowid}/roles` | HTTP 200 ; rôles remplacés par `{roles:[roleCode]}` | o | |
| 78 | `PUT /api/admin/roles/{roleCode}/permissions` | HTTP 200 ; permissions du rôle remplacées (`{permissions:[...]}`) | o | |

## 17 — Teardown & Cleanup

| # | Scénario | Attendu | O/N | Commentaire |
|---|---|---|---|---|
| 79 | `POST /api/auth/login` hajer (restauration de session) | HTTP 200 | o | |
| 80 | `POST /api/auth/logout` | HTTP 200 ; `{"success":true}` | o | |
| 81 | `GET /api/auth/me` (session fermée) | HTTP 200 ; `user:null`, `permissions:[]` | o | |

---

## Fiche de défaillance (à remplir quand un cas est en O/N = **N**)

Pour chaque échec, copier ce bloc ci-dessous dans la section des commentaires ou l'envoyer brute au développeur :

```text
CAS # : ____
Requête : ____  (méthode + URL + corps)
Statut HTTP reçu : ____  (attendu : ____)
Corps de réponse : 
  ____
Message d'erreur / stack (si présent dans les logs backend) :
  ____
Comportement attendu vs réel :
  ____
```

---

*Générée le 15/09/2026 · 80 cas + cas complémentaires listés en notes · collection Postman :
`postman/Medicis-Change-Control.postman_collection.json`.*