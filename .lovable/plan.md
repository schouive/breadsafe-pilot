## Module "Référentiel Produits" — Étape 1

### Stratégie générale

Réutiliser les tables déjà existantes (`recipes`, `product_families`, `label_templates`) et migrer/remplacer `print_products` + `print_product_variants` par le nouveau modèle plus propre **Produits maîtres ↔ Articles ERP**.

### Schéma BDD (migration Supabase)

**Tables conservées et étendues :**
- `product_families` : déjà existante (BUN, BAG, etc.) — aucun changement
- `recipes` : déjà existante — aucun changement
- `label_templates` : déjà existante — ajout colonne `template_code` typé (PRODUCT_LABEL / CARTON_LABEL / PALETTE_LABEL) si manquant

**Nouvelles tables :**

1. **`nutrition_profiles`** — profil nutritionnel partagé (kJ, kcal, lipides, AGS, glucides, sucres, fibres, protéines, sel)

2. **`products_master`** — produit générique
   - `sku_base`, `label`, `family_id` → product_families, `recipe_id` → recipes, `nutrition_profile_id` → nutrition_profiles, `active`

3. **`erp_articles`** — référence vendable EBP
   - `product_id` → products_master, `erp_code` (unique), `erp_label`, `temperature_state` (FR/FZ), `slicing_state` (SLI/WHO), `packaging_code` (U01/C05/C24/PAL), `barcode_value`, `active`

4. **`article_templates`** — liaison article ↔ template Zebra
   - `erp_article_id`, `template_id`

5. **Vue `product_label_view`** — JOIN complet pour l'impression : sku_base, code/libellé ERP, famille, recette, ingrédients (depuis `recipe_ingredients`), allergènes (agrégés), nutrition, template Zebra

**Migration de données :**
- Migrer `print_products` → `products_master` (label, sku_base, family, recipe_id)
- Migrer `print_product_variants` (combinaisons FR/FZ × SLI/WHO × U01/C05/C24/PAL) → `erp_articles` avec `erp_code` généré (`{sku_base}-{temp}-{slicing}-{packaging}`)
- Migrer les `template_name` vers `article_templates`
- Conserver `print_history` et `print_favorites` (basculer leurs FK vers `erp_articles`, ou conserver les références originales temporairement)

**Sécurité :** RLS identiques au pattern actuel — Admin/Bureau gèrent, tout authentifié lit. Soft-delete via `active=false`. Audit via `audit_logs` existant.

### Routes & UI

Nouvelle section "Référentiel Produits" dans la sidebar Paramètres remplaçant "Catalogue Impression".

```
/settings/catalog/families       → Familles (CRUD existant déjà côté DB)
/settings/catalog/recipes        → Liste recettes (lecture, lien vers /products/recipes)
/settings/catalog/master         → Produits maîtres (CRUD complet)
/settings/catalog/erp-articles   → Articles ERP (CRUD + import CSV + filtres)
/settings/catalog/templates      → Templates Zebra (CRUD)
```

### Pages à créer

1. **FamiliesSettings** — table simple (code, libellé, actif)
2. **MasterProductsSettings** — recherche, table (sku_base, label, famille, recette, profil nutri, actif), dialog création/édition/duplication, désactivation soft
3. **ErpArticlesSettings** — recherche, filtres (famille, température, conditionnement, actif), table, dialog création/édition, **bouton "Importer CSV"** (parser papaparse, mapping colonnes, prévisualisation, dry-run, insertion)
4. **TemplatesSettings** — CRUD templates Zebra
5. **CatalogRecipesSettings** — vue lecture seule des recettes liées

### Composants partagés

- `useMasterProducts`, `useErpArticles`, `useNutritionProfiles`, `useProductLabelView` (hooks React Query)
- `MasterProductDialog`, `ErpArticleDialog`, `ErpCsvImportDialog`
- Validation Zod : `erp_code` obligatoire, `product_id` obligatoire pour article ERP, `recipe_id` obligatoire pour produit maître, `template_id` obligatoire pour article ERP

### Import CSV (Articles ERP)

Format attendu (séparateur `;`) :
```
erp_code;erp_label;sku_base_master;temperature;slicing;packaging;barcode;template_code
```
- Lookup `sku_base_master` dans `products_master`
- Lookup `template_code` dans `label_templates`
- Affichage des erreurs ligne par ligne avant import
- Insertion en batch, création automatique des `article_templates`

### Impacts sur l'existant

- `/print` (PrintLabels) : adapter pour requêter `product_label_view` au lieu de `print_products`/`print_product_variants`
- `/settings/print-catalog` : remplacé par `/settings/catalog/master` (redirect)
- `usePrintLabels` hook : adapter requête

### Hors périmètre Étape 1

- Synchronisation API EBP (à venir : import CSV manuel uniquement, comme demandé)
- Historique des modifications détaillé (utiliser audit_logs existant pour MVP)
- Refonte complète de `/print` (sera adapté lors de l'étape 2)

### Livrables

- 1 migration Supabase (création tables + vue + RLS + migration de données)
- ~5 nouvelles pages dans `src/pages/settings/catalog/`
- ~4 hooks dans `src/hooks/`
- ~3 dialogs dans `src/components/settings/catalog/`
- Mise à jour `SettingsLayout` (sidebar) + `App.tsx` (routes)
