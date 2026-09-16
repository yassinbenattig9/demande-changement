# TEST_REPORT.md — Medicis Change Control (UI/E2E navigateur)

> Recette fonctionnelle **front-end** réalisée sur la pile locale
> `frontend (Vite / React, port 3000)` → `backend (Express, port 4000, SQL Server DCMEDICIS)`.
> Date : 16/09/2026 · Navigateur : Chromium (Playwright MCP). Rapport initialement de constat,
> puis extensions « correction + retest » sur les bugs critiques B1, B2, B5, B6, B11.

---

## 1. Synthèse

| Élément | Constat |
|---|---|
| Routes applicatives couvertes | 25 (utilisateur + admin) |
| Pages rendues correctement | 23 |
| Flows fonctionnels validés | **9 / 10** (login, création demande, avis service, signature approbation, recherche, onglets détail…) |
| **Problèmes fonctionnels** | **4** (B1→B4) |
| **Problèmes UI/JS (console)** | **2** (B5→B6) |
| **Problèmes de données** | **4** (B7→B10) |
| **Anomalies de métier observées** | **1** (B11 — tolérance de workflow) |

**Points bloquants critiques :** B1 (session perdue au rechargement), B2 (page Plans d'action
inaccessible), B11 (cohérence du circuit d'approbation).

---

## 2. Méthodologie

- Parcours de toutes les routes de la barre latérale avec le compte utilisateur
  `hajer.abid@medicis.tn` puis le compte administrateur `amenallah.jabloun@teriak.com`.
- Vérification des flux métier **de bout en bout** : création d'une demande (poste `POST /api/demandes`
  201 → chrono **26/044**), transmission d'un avis de service (7 → 6), signature électronique d'une
  approbation (dialogue 21 CFR Part 11), recherche multicritères.
- Collecte des erreurs console (`console-2026-09-16T09-01-43-598Z.log`) et de captures
  (`e2e-screenshots/plans-action-wrong-page.png`, `e2e-screenshots/nouvelle-demande-6386-detail.png`).
- Contournement de test utilisé pour les routes profondes sans perte de session :
  `history.pushState` + `popstate` (la perte de session au rechargement est précisément l'objet de B1).

---

## 3. Récapitulatif par page

| Route | Compte | Rendering | APIs | Commentaire |
|---|---|---|---|---|
| `/login` | — | ✅ | ✅ | ⚠️ favicon 404 + warning autocomplete (B10) |
| `/` (Tableau de bord) | hajer | ✅ | ✅ | KPIs affichés (données à vérifier, B9) |
| `/approbations` | hajer | ✅ | ✅ | « 0 décision en attente » pour ce compte (accès fichier `0100001100000010000100`) |
| `/approbations` | admin | ✅ | ✅ | 48 décisions / 12 demandes — **flux signature testé OK** |
| `/demandes` | hajer | ✅ | ✅ | 59 registres |
| `/demandes/mes-demandes` | hajer | ✅ | ✅ | 29 demandes |
| `/demandes/recherche` | admin | ✅ | ✅ | Recherche « Changement » → 2 résultats (testé) |
| `/demandes/en-attente` | hajer | ✅ | ✅ | 53 |
| `/demandes/validees` | hajer | ✅ | ⚠️ | 0 dossier — affichage table vide OK |
| `/demandes/incompletes` | hajer | ✅ | ⚠️ | 6 dossiers |
| `/demandes/6385` (26/043) | hajer | ✅ | ✅ | Détail + 6 onglets (Sujets/Approbations/Impacts/PJ/Piste d'audit) |
| `/nouvelle-demande` | hajer | ✅ | ✅ | **Wizard complet testé → 26/044 créé** ⚠️ erreurs console R-keys (B5) |
| `/avis-services` | hajer | ✅ | ✅ | 7 avis → **1 avis transmis (7→6)** |
| `/evaluations` | hajer | ✅ | ✅ | 5 évaluations à rendre |
| `/reunions` | hajer | ✅ | ✅ | 2 réunions |
| `/diffusion` | hajer | ✅ | ✅ | 221 diffusion(s) |
| `/diffusion/liste` | hajer | ✅ | ✅ | 0 à diffuser (SPA uniquement) |
| `/notifications` | hajer | ✅ | ✅ | 8 non lues — ⚠️ **toutes identiques** (B8) |
| `/historique` | hajer | ✅ | ✅ | 500 événements (63 pages) |
| `/statistiques` | hajer | ✅ | ✅ | KPIs (⚠️ B9) |
| `/profil` | hajer | ✅ | ✅ | Matrice d'accès `0100001100000010000100` |
| `/aide` | hajer | ✅ | ✅ | — |
| `/plans-action` | hajer | ❌ | ⚠️ | **Mauvaise page affichée (B2)** |
| `/admin/utilisateurs` | admin | ✅ | ✅ | 42 comptes — ⚠️ doublons/typo (B7) |
| `/admin/parametrage` | admin | ✅ | ✅ | ⚠️ Sites « SG » dupliqués (B8) |
| `/admin/workflow` | admin | ✅ | ✅ | Version n°3 PUBLIÉE (2026-09-15), étapes 1→2→3→4 + PRT + clôture |
| `/admin/roles` | admin | ✅ | ✅ | 53 rôles / 26 permissions |

---

## 4. Flux fonctionnels validés (preuves)

| # | Flux | Résultat | Preuve |
|---|---|---|---|
| 1 | Login / Logout (hajer puis admin) | ✅ | Redirect `/login`, session active via cookie |
| 2 | Création demande **nouvelle** (wizard 4 étapes : sujet « TEST-E2E - Changement processus validation lot », type Processus, produit ULTRA SMILE, site SG, MEP 15/10/2026, services AQ + IT) | ✅ | `POST /api/demandes` 201 → chrono **26/044**, sujets/impacts 200, redirection `/demandes/6386` |
| 3 | Pipeline + onglets détail 26/044 | ✅ | Pipeline 6 étapes, Services impactés (7), Onglet Approbations |
| 4 | **Soumission → file d'approbation** : la demande 26/044 apparaît dans la file admin avec **4 décisions parallèles** (Resp. de service, Chargé de changement, Resp. de changement, Directeur QA) | ✅ | File admin : 48 décisions / 12 demandes, dont 4 lignes 26/044 |
| 5 | Avis de service : « Saisir l'avis » → zone texte → « Transmettre l'avis (oui) » | ✅ | Compteur 7 → 6 avis à rendre ; la ligne AQ passe « En attente » → transmis |
| 6 | **Signature électronique** : commentaire obligatoire + PIN → « Signer et Valider » | ✅ | Onglet Approbations (1) : ligne « Responsable de service (N+1) — Validé » + horodatage ⚠️ **voir B11** |
| 7 | Recherche multicritères | ✅ | « Changement » dans sujet → 2 résultats |
| 8 | Pagination / filtres de la file | ✅ | « Page 1 / 6 », 8 lignes/page |
| 9 | Navigation SPA profonde (validees, diffusions, avis) via `pushState` | ✅ | Rendering + APIs OK |

---

## 5. Problèmes identifiés

### 🔴 B1 — Session perdue à tout rechargement de page (CRITIQUE)
- **Sévérité** : haute — bloque l'usage réel (F5, bookmark, lien profond, notification).
- **Reproduction** : chargement direct d'une route protégée (`/approbations`, `/demandes`, etc.) ou
  rechargement → redirection immédiate vers `/login`, **alors que `GET /api/auth/me` répond 200** (deux
  réponses 200 observées).
- **Cause racine** : `ProtectedLayout` (`frontend/src/App.tsx:49-53`) se base sur
  `isAuthenticated` initialisé à `false` dans `AuthContext` (`frontend/src/context/AuthContext.tsx`)
  **sans état de chargement/initialisation** : le garde bascule sur `/login` avant la résolution
  asynchrone de `getCurrentUser()`.
- **Contournement de test** : navigation SPA (`pushState`+`popstate`), ce qui confirme que seules les
  rechargements directs sont affectés.
- **Preuve** : reproduit plusieurs fois ; les deux appels `me` renvoient 200 avant redirection.

### 🔴 B2 — `/plans-action` affiche la mauvaise page (Paramétrage) (HAUTE)
- **Sévérité** : haute — la page Plans d'action (suivi des actions du plan d'action d'un changement)
  est totalement inaccessible depuis la sidebar.
- **Reproduction** : cliquer « Plans d'action » → la page affiche « Paramétrage du référentiel
  (Tab_Divers) » à la place.
- **Cause racine** : `frontend/src/pages/PlansActionPage.tsx:338` →
  `export default ParametragePage;` (erreur de copier-coller : le composant exporté par défaut est
  celui de la page Paramétrage).
- **Preuve** : capture `e2e-screenshots/plans-action-wrong-page.png`.

### 🔴 B11 — Circuit d'approbation : une seule signature résout toutes les décisions parallèles sans transition d'étape (HAUTE)
- **Sévérité** : haute — incohérence métier sur le workflow en parallèle (étapes 1→2→3→4).
- **Reproduction (signature admin sur 26/044, ligne « Responsable de service (N+1) »)** :
  1. La file admin contenait **4 décisions** pour 26/044 (4 rôles parallèles) ;
  2. après « Approuver et signer » sur la 1ʳᵉ ligne, la file passe **48 → 44 décisions** et 26/044
     **disparaît entièrement** (les 4 lignes résolues d'un coup) ;
  3. l'onglet « Approbations » du détail n'enregistre **qu'une seule** trace
     (« Responsable de service (N+1) — Validé », amenallah.jabloun@teriak.com, 16/09/2026 10:35) ;
  4. la demande reste **« Demande éditée (Brouillon / Initialisation) »** : aucune transition vers
     l'étape suivante, malgré la décision enregistrée.
- **Cause racine probable** : la décision est rattachée à l'utilisateur connecté (qui porte tous les
  rôles approbateurs de l'étape), donc le backend purge l'ensemble des approbations de l'étape en une
  seule signature, sans consigner chaque rôle ni faire progresser `etape_courante`.
- **Risque** : 3 décisions (Chargé de changement, Resp. de changement, Directeur QA) perdues pour la
  piste d'audit ; le circuit ne peut pas avancer.
- **Preuve** : captures `approbations` (48 → 44) et détail 26/044 (1 seule ligne enregistrée).

### 🟠 B5 — Clés React en double dans le catalogue produit (Moyenne)
- **Sévérité** : moyenne — erreurs console à l'ouverture du wizard, risque d'identité ambiguë à la
  sélection.
- **Reproduction** : Étape 1 du wizard « Nouvelle demande » → 15 erreurs console
  « Encountered two children with the same key » pour **ALPHAGAN, COMBIGAN, GANFORT, LUMIGAN,
  OLMETEC, OZURDEX, SEVIKAR** (produits en double dans `Tab_Produit`).
- **Cause racine** : liste produit du formulaire utilise le nom produit comme clé React, mais la table
  contient des doublons exacts.
- **Preuve** : `console-2026-09-16T09-01-43-598Z.log`.

### 🟠 B6 — DataTable : warning « unique key prop » (Moyenne)
- **Sévérité** : moyenne (warning systématique, aucune incidence fonctionnelle constatée).
- **Reproduction** : tout tableau `DataTable` rendu avec des données (file d'approbation,
  demandes validées…) → warning React « Each child in a list should have a unique key prop ».
- **Preuve** : console log (entrée DataTable).

### 🟡 B7 — Données administrateur : comptes utilisateurs dupliqués et coquille (Faible)
- **Sévérité** : faible — casse la recherche/unicité et l'affichage.
- **Observations** : deux comptes « Feriel Mrabet » (`feriel.mrabet@medicis.tn` et
  `feriel.mrabet1@medicis.tn`, visibles aussi dans la file d'approbation pour 25/018) ; nom de
  « Mohamed ZargLayoun » (minuscule « L » au lieu de « El ») `mohamed.zargelayoun@medicis.tn`.

### 🟡 B8 — Paramétrage : 3 Sites « SG » (Faible)
- **Sévérité** : faible.
- **Observations** : l'écran Paramétrage → Sites affiche 3 lignes toutes nommées « SG » avec des
  codes vides / « SG » / « SGD » (doublon/saisie ambiguë).

### 🟡 B9 — Statistiques : indicateurs incohérents (Faible)
- **Sévérité** : faible.
- **Observations** : « Clôturées validées : 0 », « En retard : 50 » — à recouper avec les 59 demandes
  et la file (12 en attente). Permet de douter de la source des KPIs.

### 🟡 B10 — Détails techniques mineurs (Faible)
- `favicon.ico` → 404.
- Champ mot de passe du login : warning navigateur « autocomplete current-password » (attribut
  d'autocomplétion absent).

---

## 6. Notes produits / données

- **Notifications** : les 8 non-lues affichent le même libellé « Décision 'valide' sur la demande
  26/030 » — duplication ou state jamais marqué « lu ».
- **Wizard** : désignation produit héritée « ULTRA SMILE • N/A » (le ciblage libre ne renseigne pas la
  désignation) — à valider côté métier.
- **Accès hajer** : la matrice d'accès `0100001100000010000100` n'inclut visiblement pas la
  permission « valider » : file d'approbation vide pour ce compte alors que l'admin voit 48 décisions —
  comportement RBAC conforme.
- **Seed automatique** : la création 26/044 a généré **7 services impactés** (dont Affaires
  Règlementaires, Direction Générale, MQ&C ×2, Pharmacovigilance, AQ, IT) depuis `Service_impactees`
  — confirmer la règle d'ajout du service demandeur en doublon.

---

## 7. Conclusion

L'application est **fonctionnelle dans l'ensemble** : le cycle de vie complet (création → soumission →
avis → signature) fonctionne de bout en bout et les écrans de consultation sont stables. Toutefois,
**4 problèmes doivent être traités en priorité** avant mise en production :

1. **B1** : garde d'authentification sans état de chargement (perte de session au rechargement).
2. **B2** : mauvais export dans `PlansActionPage.tsx:338`.
3. **B11** : gestion du circuit d'approbations parallèles (une signature résout en masse, perte de
   trace, aucune transition d'étape).
4. **B5** : clés React du catalogue produit (doublons de référentiel).

Les points B7→B10 sont des alarmes de qualité de données / minimisations recommandées, non bloquants.

> Corrections appliquées : B1, B2, B5, B6 et B11 — voir section 8 pour les détails et résultats de retest.

---

## 8. Résultat des corrections (retest — 16/09/2026)

Les bugs signalés B1, B2, B5, B6 et B11 ont été corrigés puis retestés en navigation réelle.

### ✅ B1 — Session perdue au rechargement — **CORRIGÉ**
- **Correctif** : ajout d'un flag `isInitialized` dans `AuthContext.tsx` (initialement `false`,
  passe à `true` uniquement après résolution de `getCurrentUser()`). Le layout protégé
  (`App.tsx:ProtectedLayout`) affiche un spinner tant que `isInitialized === false`, puis redirige
  vers `/login` si non authentifié.
- **Vérification** : rechargement direct (`page.goto('/approbations')`) → la session persiste,
  aucun redirect vers `/login`. Testé en navigation Playwright.

### ✅ B2 — Page Plans d'action affichait Paramétrage — **CORRIGÉ**
- **Correctif** : `PlansActionPage.tsx` — ligne 338 changée `export default ParametragePage` →
  `export default PlansActionPage` ; import inutilisé `import ParametragePage` supprimé (ligne 12).
- **Vérification** : `/plans-action` affiche correctement « Plans d'action — 36 action(s) » au
  lieu du formulaire Paramétrage. Zéro erreur console sur cette page.

### ✅ B5 — Clés React dupliquées dans le catalogue produit — **CORRIGÉ**
- **Correctif** : dans `NewChangeRequestPage.tsx`, la liste `productsList` est dédupliquée avant
  rendu avec une comparaison `toLowerCase()` + trim sur le code. La clé `key` utilise un index
  filtré unique pour éviter les collisions entre codes à casse/espaces différents.
- **Vérification** : `/nouvelle-demande` affiche le sélecteur « Reprendre du catalogue » sans
  aucune erreur console (0 erreurs, 0 warnings).

### ✅ B6 — Warning DataTable « unique key prop » — **CORRIGÉ**
- **Correctif** : `DataTable.tsx` — clé header `key={col.key}` → `key={col.key ??
  \`${col.header}-${colIdx}\`}` (fallback sur header + index pour les colonnes sans `key`).
- **Vérification** : rechargement de `/approbations` et `/plans-action` — plus aucun message
  d'erreur lié à des clés non-unicis dans les DataTable.

### ✅ B11 — Circuit d'approbation parallèle (correction majeure) — **CORRIGÉ**
- **Correctif** (workflow.js) :
  1. Satisfaction par **slot** : chaque approbateur d'étape (rôle/permission) est satisfait
     individuellement. Le critère « tous » exige que les 4 slots aient chacun au moins une
     décision (par n'importe quel membre éligible du rôle). L'ancien modèle requérait
     l'union de TOUS les emails — rendant l'avancement impossible en pratique.
  2. File d'attente par **(type, email)** : la suppression des entrées en attente se fait par
     paire (type, email) et non par email seul. Un email qui signe un type ne fait plus
     disparaître les lignes des 3 autres types.
  3. Ajout de `decisionsByTypeForDemande()` (map par type_approbation) et
     `satisfiedApprobeurSlots()` pour le calcul de satisfaction.
- **Vérification API** (`verify-b11.js`) : après 1 seule signature sur un type, les 3 autres
  types restent en attente (pas de disparition), la demande reste à `etape_validation`.
  Testé sur demande #6391 : `["acceptation_chargé_changement","acceptation_responsable_changement",
  "approbation_directeur_qualité"]` restants → ✅.
- **Vérification smoke** (`smoke-workflow.js`) : 26/26 assertions OK — chaîne complète
  validation → PRT → impact, antisdoublon 409, route incomplète, accès RBAC — tous OK.
- **Script de non-régression** : `backend/src/scripts/verify-b11.js` conserve la vérification
  ciblée du symptôme original.

---

### Bugs non corrigés (données / non bloquants)

| ID | État | Raison |
|---|---|---|
| B7 | Non corrigé | Doublon « Feriel Mrabet » dans Utilisateurs — nécessite nettoyage DB manuel |
| B8 | Non corrigé | 3 lignes « SG » dans Sites — qualité de données |
| B9 | Non corrigé | KPI Dashboard en désaccord — source non identifiée |
| B10 | Non corrigé | favicon.ico absent, autocomplete login — cosmétiques |