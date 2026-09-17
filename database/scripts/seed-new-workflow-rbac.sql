/*
  Permissions du nouveau circuit Change Control.
  Le schéma existant reste inchangé. Exécuter ce script une seule fois sur la base cible.
*/

SET NOCOUNT ON;

DECLARE @permissions TABLE (
  code NVARCHAR(150) NOT NULL,
  libelle NVARCHAR(250) NOT NULL,
  module NVARCHAR(100) NOT NULL
);

INSERT INTO @permissions (code, libelle, module)
VALUES
  ('approbation.n_plus_un', 'Validation hiérarchique N+1 / signataire', 'Approbations'),
  ('approbation.directeur_changement', 'Validation du Directeur Changement', 'Approbations'),
  ('approbation.dg', 'Décision finale du Directeur Général', 'Approbations'),
  ('plan_action.responsable_qualite', 'Création du plan d’action par le Responsable Qualité', 'Plan d’action');

INSERT INTO [Permissions] (code, libelle, module)
SELECT p.code, p.libelle, p.module
FROM @permissions p
WHERE NOT EXISTS (
  SELECT 1 FROM [Permissions] existing WHERE existing.code = p.code
);

SELECT p.id_perm, p.code, p.libelle, p.module
FROM [Permissions] p
WHERE p.code IN (
  'approbation.n_plus_un',
  'approbation.directeur_changement',
  'approbation.dg',
  'plan_action.responsable_qualite'
)
ORDER BY p.code;
