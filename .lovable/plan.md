# Programmes d'impression clients + Mode rapide

## Objectif

Remplacer la logique générique de `print_batches` (sessions ad‑hoc) par une logique métier : des **programmes clients** réutilisables, exécutés en quelques clics par les opérateurs, plus un **mode rapide** sans sauvegarde.

## Base de données

Nouvelles tables (migration) :

**print_programs**
- `id` uuid PK
- `name` text NOT NULL
- `customer_code` text
- `customer_name` text
- `active` boolean default true
- `created_by`, `created_at`, `updated_at`

**print_program_items**
- `id` uuid PK
- `program_id` uuid FK → print_programs(id) ON DELETE CASCADE
- `erp_article_id` uuid FK → erp_articles(id) ON DELETE CASCADE
- `print_order` int default 0
- `default_quantity` int default 1
- `created_at`, `updated_at`

RLS :
- SELECT pour tous les utilisateurs authentifiés
- INSERT/UPDATE/DELETE pour `admin` + `quality` + `office`
- Opérateurs : lecture seule + exécution (pas de modif structure)

Anciennes tables `print_batches` / `print_batch_items` / `print_jobs` : **conservées** (historique / journalisation), mais la nav et les pages génériques disparaissent.

## Pages & navigation

`PrintLayout` — nouveau menu :
- Étiquettes Production (`/print`) — inchangé
- Programmes clients (`/print/programs`)
- Impression rapide (`/print/quick`)

Suppression : `/print/orders` et `/print/orders/:id` (PrintOrdersList, PrintOrderDetail).

## UI : Programmes clients (`/print/programs`)

Grille de cartes :
- Nom programme
- Client (`customer_name` — `customer_code`)
- Compteur produits
- Badge actif / inactif
- Boutons : **Ouvrir** (exécuter), **Modifier**, **Dupliquer**, **Désactiver/Activer**, **Supprimer** (admin)

Bouton **+ Créer** en haut.

Modal CRUD (`ProgramFormDialog`) :
- name, customer_code, customer_name, active
- Liste éditable des lignes : recherche article ERP, quantité par défaut, ordre (drag/handle simple), suppr ligne, dupliquer ligne

## UI : Exécution programme (`/print/programs/:id/run`)

Chargement auto de toutes les lignes du programme.

En haut :
- **Date de fabrication globale** (calendrier) → calcule lot global format `LJJJYY` (réutiliser `computeLotNumber` existant)
- **DDM globale** (calendrier)
- Bouton **« Appliquer à toutes les lignes »**

Tableau lignes (lecture seule sauf qty/lot/ddm overrides) :
- Code ERP · Nom produit · Quantité (éditable) · Lot (éditable, prérempli avec lot global) · Date fab (éditable) · DDM (éditable)
- Statut par ligne : pending / printing / printed / failed

Bouton **IMPRIMER LE PROGRAMME** : envoie ZPL ligne par ligne via WebUSB Zebra (réutilise `buildProductZpl` + `zebraWebUsb`). Statut mis à jour en direct.

Aucune persistance d'« exécution » obligatoire (pas de batch créé). Optionnel : enregistrer dans `print_history` en best‑effort.

## UI : Impression rapide (`/print/quick`)

- Recherche article ERP (combobox, réutilise `usePrintProducts`)
- Date de fabrication → lot auto (modifiable)
- DDM
- Quantité
- Bouton **Imprimer** → ZPL direct, pas de sauvegarde
- Petit historique de session en mémoire (les 10 dernières impressions de la session)

## Détails techniques

- Hook `usePrintPrograms` (list, get, create, update, duplicate, toggleActive, delete) + `usePrintProgramItems`
- Réutilisation : `usePrintProducts` (articles ERP enrichis FT), `buildProductZpl`, `zebraWebUsb`, `computeLotNumber`
- `src/integrations/supabase/types.ts` régénéré automatiquement après migration

## Hors scope

- Pas de modification de PrintLabels (étiquettes production) ni du module ERP
- Pas de suppression physique des tables `print_batches` (gardées pour l'historique)
