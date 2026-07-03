# Module « Journal de Production »

Nouveau module complet permettant au chef de production de planifier la fabrication, aux opérateurs de suivre pas à pas les étapes du process, et au responsable de superviser la journée en temps réel.

## Pages livrées

### 1. Planning de production (`/production`)
- Tableau du jour, trié automatiquement par heure prévue de lancement.
- Bouton **+ Nouvelle production** ouvrant un formulaire avec :
  - Recette (liste déroulante liée au module Recettes existant)
  - Nombre de chariots, quantité totale
  - Heure prévue, priorité (Basse / Normale / Haute / Urgente)
  - Responsable, observations
- Statut par ligne : À faire / En cours / Terminée (badge coloré).
- Bouton **▶ Lancer la production** : passe le statut à *En cours*, horodate le lancement et crée automatiquement la fiche de journal associée.
- Navigation directe vers la fiche de journal en cliquant sur une ligne.
- Interface optimisée tablette (grandes cellules, gros boutons).

### 2. Journal de Production (`/production/journal/:id`)
- En-tête récap : date, recette, chariots, responsable, opérateur.
- Suivi chronologique des étapes avec **un gros bouton par étape** enregistrant l'heure au clic :
  1. Début pétrissage
  2. Fin pétrissage
  3. Température de pâte (saisie manuelle en °C)
  4. Début façonnage
  5. Début de ligne
  6. Mise en pousse
  7. Sortie de pousse
  8. Enfournement
  9. Sortie du four
  10. Fin de production
- Chaque horodatage est modifiable (édition en ligne).
- Champ **Commentaires** libre.
- Panneau **Indicateurs calculés automatiquement** :
  - Durée pétrissage
  - Temps entre fin pétrissage et début de ligne
  - Temps de pousse
  - Temps de cuisson
  - Temps total de fabrication
- **Alertes visuelles rouges** :
  - Température pâte < 22 °C ou > 26 °C
  - Temps de pousse > durée définie sur la recette
  - Production non lancée à l'heure prévue

### 3. Tableau de bord (`/production/dashboard`)
- 4 cartes KPI du jour : Prévues / En cours / Terminées / En retard.
- Tableau temps réel : Recette · Statut · Heure prévue · Heure réelle · Retard.
- Coloration : rouge = en retard, orange = en cours, vert = terminée.

### 4. Historique (`/production/history`)
- Liste de toutes les productions passées.
- Filtres : Date (plage), Recette, Responsable, Opérateur.
- Affiche tous les temps enregistrés + commentaires.
- Boutons **Export PDF** et **Export Excel**.

## Intégration au reste de l'application

- Nouvelle carte **Journal de Production** sur la page d'accueil (`/`).
- Ajout du module dans le `ModuleLayout` avec sa propre sidebar (Planning · Journal · Tableau de bord · Historique).
- Nouveau type de module dans `AppModule` + gestion RBAC (`user_module_access`) : admin + rôle *bureau_methodes* et *operator* accèdent par défaut.
- Sélection de recette branchée sur `useRecipes` : pré-remplit automatiquement le nom, et — quand ils existent sur la recette — les temps de référence (pétrissage / pousse / cuisson) et les températures cibles, utilisés pour les alertes.

## Détails techniques

### Base de données (2 nouvelles tables)

```text
production_plans
  ├─ id, date, recipe_id → recipes
  ├─ chariots (int), quantity_total (numeric)
  ├─ scheduled_time (timestamptz)
  ├─ priority (enum: low/normal/high/urgent)
  ├─ manager_name, observations
  ├─ status (enum: pending/in_progress/completed)
  ├─ started_at, completed_at
  └─ created_by, timestamps

production_journals
  ├─ id, plan_id → production_plans (unique)
  ├─ recipe_id, operator_name, manager_name
  ├─ chariots
  ├─ kneading_start, kneading_end
  ├─ dough_temperature (numeric)
  ├─ shaping_start, line_start
  ├─ proofing_start, proofing_end
  ├─ oven_in, oven_out
  ├─ production_end
  ├─ comments
  └─ timestamps
```
- RLS : lecture pour `authenticated`, écriture pour admin / bureau_methodes / operator. GRANT explicites `authenticated` + `service_role`.
- Trigger `updated_at` standard.
- Aucune donnée de départ ; la table démarre vide.

### Frontend
- `ProductionLayout.tsx` (sidebar) sur le modèle de `ProductsLayout`.
- Pages sous `src/pages/production/` : `PlanningPage`, `JournalPage`, `DashboardPage`, `HistoryPage`.
- Hooks React Query : `useProductionPlans`, `useProductionJournal`.
- Composant `StepButton` réutilisable (grand bouton tactile avec heure + édition inline).
- Calculs et alertes centralisés dans `src/lib/productionMetrics.ts` (durées + seuils température 22 / 26 °C).
- Export historique : PDF via `jspdf` (déjà dans le projet), Excel via `xlsx` (ajout dépendance si absent).

### Évolutivité (préparé mais non exposé)
Le schéma laisse la place pour brancher plus tard : lots matières premières, contrôles qualité, rendements/pertes, KPIs — sans casser la structure actuelle.

## Hors périmètre de cette itération
- Traçabilité des lots MP, contrôles qualité intégrés, calculs de rendement/pertes, KPIs avancés (préparés dans le schéma, à activer plus tard).
- Notifications push / e-mail sur alertes (affichage écran uniquement).
