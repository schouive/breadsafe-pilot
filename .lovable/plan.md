# Refonte : Conditionnements dans la FT

## Objectif
Simplifier la chaîne **FT → Produit Maître → Article ERP → Étiquette** en intégrant directement les conditionnements dans la Fiche Technique. Une FT contiendra une **sous-table de conditionnements**, et les étiquettes du catalogue d'impression seront générées directement depuis ces lignes.

## Architecture cible

```text
AVANT :
  product_sheets ──► products_master ──► erp_articles ──► print catalog
                                          (C04/C05/U01...)

APRÈS :
  product_sheets ──► product_sheet_packagings ──► print catalog
                     (C04/C05/U01, code-barres,
                      pcs/carton, poids carton...)
```

## 1. Nouvelle table `product_sheet_packagings`

Sous-table liée à `product_sheets`. Une ligne = un conditionnement vendable d'un même produit.

Champs :
- `product_sheet_id` (FK vers product_sheets)
- `packaging_code` (U01, C04, C05, C18, C24, PAL)
- `erp_code` (code interne, ex: PMC500-C04)
- `erp_label` (libellé commercial, ex: "Pain de mie carton x4")
- `barcode_value` (EAN13, optionnel)
- `temperature_state` (FR/FZ)
- `slicing_state` (SLI/WHO)
- `pieces_per_carton`, `cartons_per_layer`, `layers_per_pallet`
- `carton_weight`, `carton_dimensions`
- `template_id` (FK vers `label_templates` pour le ZPL)
- `active`, `print_order`

RLS : Admin / Bureau Méthodes manage, tous authentifiés peuvent voir.

## 2. UI Fiche Technique

Ajout d'une nouvelle section **"Conditionnements"** dans `TechnicalSheetFormDialog.tsx`, après la section Logistique :

- Tableau avec colonnes : Code (U01/C04…), Code ERP, Libellé, Code-barres, État (FR/FZ), Tranchage, Pcs/carton, Poids carton, Template ZPL, Actif
- Bouton "+ Ajouter un conditionnement"
- Suppression ligne par ligne
- Le bloc Logistique global (pieces_per_carton, etc.) actuel devient la **valeur par défaut** réutilisée à la création d'une nouvelle ligne, puis chaque ligne est éditable indépendamment

## 3. Catalogue d'impression

Le module **Étiquetage** (`PrintLabels.tsx`, `usePrintLabels`, `buildProductZpl`) lit désormais `product_sheet_packagings` au lieu de `erp_articles`.

- Sélecteur produit → liste des FT validées
- Sélecteur conditionnement → lignes de `product_sheet_packagings` actives
- Génération ZPL : utilise `template_id` + variables issues de la FT + ligne packaging
- Programmes clients (`print_program_items`) : remplacement de `erp_article_id` par `packaging_id`

## 4. Migration des données existantes

Script SQL one-shot qui pour chaque `erp_articles` :
1. Trouve la FT correspondante via `products_master.product_sheet_id`
2. Crée une ligne `product_sheet_packagings` avec les mêmes valeurs
3. Met à jour `print_program_items.packaging_id` à partir de `erp_article_id`

Puis suppression des tables :
- `article_templates`
- `erp_articles`
- `products_master`
- `nutrition_profiles` (la nutrition vit déjà sur la recette via la vue SQL)

## 5. Suppression UI

À retirer du menu **Paramètres** :
- Page "Référentiel Produits ERP" (`/settings/catalog/erp-articles`)
- Page "Familles produits" si plus utilisée ailleurs (à vérifier)
- Page "Conditionnements" globale → reste utile comme référentiel des codes valides
- Page "Templates ZPL" → conservée
- Import CSV des Articles ERP → supprimé

## Points techniques

- Type Supabase auto-régénéré après migration → adapter tous les hooks (`useProductCatalog`, `usePrintLabels`, `usePrintPrograms`)
- La contrainte CHECK `packaging_code` migre vers la nouvelle table (U01, C04, C05, C18, C24, PAL)
- Mémoire à mettre à jour : remplacer `referentiel-produits-erp-v1` par `conditionnements-dans-ft-v1`

## Périmètre exclu de ce lot
- Pas de changement sur le moteur de recette / nutrition / INCO
- Pas de changement sur le workflow de validation FT
- Pas de changement sur les étiquettes carton (`carton_labels`)

## Étapes d'implémentation
1. Migration SQL : création `product_sheet_packagings` + copie depuis `erp_articles` + mise à jour `print_program_items`
2. UI FT : section Conditionnements
3. Refacto étiquetage : lecture depuis nouvelle table
4. Refacto programmes clients : nouveau FK
5. Suppression menus + tables obsolètes
6. Mise à jour mémoire projet
