## Contexte et conflit

Le projet a déjà :
- `recipes` + `recipe_ingredients` (recettes complètes avec calculs boulanger, % hydratation, PI imbriqués…)
- `raw_materials` (matières premières avec allergènes, nutrition, fournisseurs, densité…)
- `product_sheets` (fiches techniques INCO validées)
- `print_products` + `print_product_variants` + `print_history` + `print_favorites` (créés récemment pour l'impression Zebra)

Les nouvelles tables demandées (`recipes`, `ingredients`, `recipe_ingredients`, `products`, `product_variants`…) **entrent en collision directe** avec l'existant et sont une version simplifiée de ce qui existe déjà.

## Proposition

Plutôt que de dupliquer, **enrichir et relier l'existant** au modèle d'impression Zebra :

### 1. Nouvelles tables (sans conflit)

- `product_families` (BUN, BAG, HDG, PDM, PLQ, SPC) — référentiel familles
- `allergens` (GLUTEN, SESAME…) — référentiel normalisé (aujourd'hui c'est un `text[]` libre)
- `packaging_types` (U01, C05, C24, PAL) — référentiel conditionnement
- `label_templates` (PRODUCT_LABEL, CARTON_LABEL, PALETTE_LABEL) — templates Zebra
- `nutrition_profiles` — optionnel, mais déjà calculée à la volée via vue SQL existante (`v_recipe_nutrition_per_100g`)

### 2. Évolution des tables existantes

- `print_products` → ajout `family_id` (FK), `recipe_id` (FK vers `recipes`), `product_sheet_id` (FK), `nutrition_profile_id` (optionnel)
- `print_product_variants` → renommage logique en variant + packaging séparés ; ajout `template_id` (FK)
- Nouvelle `product_packaging` pour combinaisons autorisées
- Nouvelle `variant_templates` pour mapping variant+packaging→template

### 3. Vue SQL `product_label_view`

Regroupe : produit, famille, recette, ingrédients (depuis `recipe_ingredients` existant), allergènes (depuis `raw_materials.allergens`), nutrition (vue existante), conditionnement, template Zebra.

### 4. Interface Admin "Paramétrage Produits"

Nouvelle page `/products/print-settings` avec onglets : Familles, Produits Imprimables, Variantes, Conditionnements, Templates. Recherche, filtres, édition inline, soft delete (`active=false`). Restreint aux rôles admin/bureau_methodes.

⚠️ **Pas de duplication** des onglets Recettes / Ingrédients / Allergènes : ils existent déjà dans `/products/recipes` et `/settings`.

### 5. Règles métier (contraintes DB)

- `print_products.recipe_id NOT NULL` + FK
- `print_products.family_id NOT NULL` + FK
- Trigger : insertion `print_history` impossible si combinaison `variant + packaging` absente de `variant_templates`
- Soft delete via `active boolean`
- Audit via `audit_logs` existant

### Détails techniques

**Migrations SQL** : 1 fichier qui crée familles, allergènes normalisés, packaging, templates, variant_templates, ajoute FK sur `print_products`, crée la vue `product_label_view`, seed les valeurs (BUN/BAG/HDG/PDM/PLQ/SPC, U01/C05/C24/PAL, 14 allergènes UE).

**Front** : nouvelle page `PrintSettings.tsx` + sous-composants par onglet, hook `usePrintAdmin.tsx`. Connexion à `usePrintLabels` pour que la liste produits affiche `family.label` et que la sélection variante/packaging se base sur `variant_templates`.

**RLS** : lecture authentifiée, écriture admin/bureau_methodes (cohérent avec l'existant).

## Questions avant de coder

1. Confirmes-tu qu'on **enrichit l'existant** plutôt que de créer un schéma parallèle qui ferait doublon avec `recipes`/`raw_materials`/`product_sheets` ?
2. Pour les **allergènes**, on migre vers une table normalisée ou on garde le `text[]` actuel sur `raw_materials` (plus simple, déjà fonctionnel) ?
3. La page Admin "Paramétrage Produits" doit-elle être une **nouvelle page dédiée** (`/products/print-settings`) ou intégrée dans `/settings` ?