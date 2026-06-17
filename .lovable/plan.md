# Étiquettes carton multilingues

Permettre, à partir d'une **même recette et d'une même fiche technique**, de générer plusieurs étiquettes carton dans des langues différentes (FR, EN, et extensible) sans rien dupliquer en amont. Chaque étiquette est une variante linguistique de la FT source.

## Concept

Aujourd'hui une `carton_label` figeait un instantané de la FT (INCO, conservation, décongélation, nutrition…) en français. On garde ce principe, mais on ajoute une **langue** à l'étiquette et on permet d'éditer les champs textuels traduisibles tant que l'étiquette est en brouillon — comme on le fait déjà pour l'INCO HTML.

Une FT peut donc avoir N étiquettes (une FR, une EN, une DE…), chacune avec son propre snapshot traduit, sa propre validation et son propre cycle de vie.

## Changements

### 1. Base de données
- Ajouter `language text not null default 'fr'` sur `carton_labels`.
- Index `(product_sheet_id, language)` pour retrouver rapidement la variante d'une langue donnée.
- Pas de contrainte d'unicité : on peut avoir plusieurs versions/historiques pour une même langue.

### 2. Création d'une étiquette (`CartonLabelFormDialog`)
- Nouveau sélecteur **Langue** (Français, English, Deutsch, Español, Italiano — liste extensible côté code).
- Stocké à la création; le titre saisi peut déjà être en EN ("Croissant Butter CT12").

### 3. Édition d'une étiquette en brouillon (`CartonLabelDetailSheet`)
- L'édition INCO existante reste (déjà OK pour traduire la liste d'ingrédients).
- Ajout de l'édition de **Conservation** et **Décongélation** (champs texte) pour permettre la traduction de ces consignes. Disponible uniquement en statut `draft`, comme l'INCO.
- Après validation, plus rien n'est modifiable (comportement actuel conservé).

### 4. Affichage
- Badge **langue** (FR / EN / …) à côté du titre dans la liste (`CartonLabelManagement`) et dans le détail.
- Aperçu (`CartonLabelPreview`) et impression HTML : libellés des sections traduits selon `language` (ex. "Ingredients:", "Storage:", "Thawing:", "Net weight:" en EN). Le contenu (INCO HTML, instructions) provient déjà du snapshot traduit.

### 5. Hook `useCartonLabels`
- `useCreateCartonLabel` accepte `language`.
- Nouveau mutation `useUpdateCartonLabelTexts` pour mettre à jour `snapshot_storage_instructions` / `snapshot_thawing_instructions` sur brouillons.
- `CartonLabel` type étendu avec `language`.

## Hors scope

- Pas de traduction automatique IA (peut être ajoutée plus tard).
- Pas de champs EN sur la FT elle-même : la traduction vit au niveau étiquette.
- ZPL / export Zebra : pas touchés dans ce premier pas (à faire dans un second temps si besoin de codes-barres / programmes d'impression en EN).
