# SafeHarvest Suite

En tant que boulangerie industrielle (Breadshop SAS) visant la certification IFS, nous cherchons à développer une application digitale, intuitive et performante pour la gestion de notre plan HACCP et la maîtrise de nos risques sanitaires. L'objectif est de remplacer nos processus manuels par une solution dématérialisée, garantissant une traçabilité impeccable, une réactivité accrue face aux non-conformités, et une préparation optimale aux audits IFS. L'application doit être "lovable" : facile à utiliser, visuellement agréable, et réellement aidante pour nos équipes terrain et la direction.

Public Cible :

Opérateurs / Personnel de Production et Réception : Pour la saisie quotidienne des contrôles, la déclaration des non-conformités. Doit être simple, rapide et ergonomique sur tablette.
Assistant Qualité / Responsable HACCP (DG, Assistant Qualité) : Pour la planification, la supervision des contrôles, la gestion des non-conformités, la validation des actions correctives, et la génération de rapports.
Direction : Pour un aperçu global de la performance HACCP et des indicateurs clés.
Fonctionnalités Clés et Rôles Associés (basées sur le document fourni) :

L'application doit permettre de digitaliser chaque ligne de votre "PLAN HACCP et CONTROLE".

Digitalisation des Points de Contrôle (CP/CCP) :

Création de Fiches de Contrôle Dynamiques : Pour chaque "ETAPE CRITIQUE/DANGER" et "CP et CCP" identifié (ex: CP1 Température, CP2 Intégrité, CP3 DLC, CP4 Allergènes, CP5 Corps Étranger, CP6 Stockage Positif, CP7 Stockage Négatif, CP8 DLC périmée).
Critères de Conformité Intégrés : Pour chaque contrôle, les "CONFORME SI..." (ex: Température respectée, emballage propre, DLC > X semaines) doivent être pré-enregistrés et permettre une évaluation rapide (vert/rouge/orange).
Saisie Assistée :
Températures : Champs numériques avec plages de conformité (ex: -18°C à -22°C pour surgelé, < 3°C au-dessus pour réfrigéré). Déclenchement automatique d'une alerte en cas de non-conformité.
Visuel / Intégrité : Boutons radio (Conforme/Acceptable/Non-conforme) et possibilité d'ajouter des photos (ex: "Photo prise sur la tablette du coup de tampon").
Dates Limites de Consommation (DLC) : Saisie de la DLC avec calcul automatique du temps restant et alerte en fonction des critères "CONFORME SI..." et "Acceptable si...".
Allergènes / Composition (CP4) : Checklist ou champs de saisie pour vérifier la composition et les allergènes, avec comparaison possible à une référence (photo de qualité).
Corps Étrangers (CP5) : Déclaration de détection/non-détection.
Attribution des Responsables : Chaque contrôle doit être assigné à un "RESPONSABLE" (DG, Assistant Qualité).
Modalités et Fréquence : Les "MODALITES" (ex: "1 fois au moins par réception", "Contrôle 100%", "Enregistrement manuel quotidien") doivent permettre de générer un planning de contrôle.
Gestion des Non-Conformités et Actions Correctives :

Déclenchement Automatique : Dès la saisie d'un contrôle "Non-conforme" ou "Acceptable" (si besoin d'action).
Workflow d'Actions : Intégration du champ "QUE FAIRE SI NON-CONFORME ?** PRINCIPE" (ex: "refus de la marchandise", "avertissement au fournisseur", "éjecter", "jeter").
Attribution et Suivi : Les actions doivent être attribuées aux "RESPONSABLE" pour non-conformité (DG) avec des statuts (En cours, Réalisé, Validé).
Preuves : Possibilité d'attacher des photos et des commentaires aux actions correctives.
Traçabilité Complète : Chaque non-conformité et action corrective doit être horodatée et signée électroniquement par l'utilisateur.
Planification et Rappels :

Calendrier des Contrôles : Affichage clair des contrôles à effectuer, réalisés, et en retard.
Notifications : Rappels automatiques pour les contrôles à venir, les DLC proches, les non-conformités en attente de traitement.
Traçabilité et Enregistrement Numérique (Audit IFS) :

Historique Complet : Toutes les saisies de contrôles, non-conformités, et actions correctives doivent être archivées de manière sécurisée et inaltérable.
Remplacement des Supports Physiques : Digitalisation des "SUPPORT DE L'ENREGISTREMENT" (ex: "Tampon de contrôle d'entrée sur bon de livraison", "Check-list hygiène scannée", "Fichiers informatiques") et des "LIEU DE CLASSEMENT ET DUREE" (5 ans).
Recherche et Filtrage : Possibilité de retrouver facilement tout enregistrement par date, CP/CCP, responsable, statut, etc.
Exportation : Fonctionnalité d'exportation des données pour les audits (PDF, Excel).
Rapports et Tableaux de Bord (pour l'Assistant Qualité et la Direction) :

Vue d'Ensemble des Conformités : Taux de conformité par CP/CCP, par période, par fournisseur.
Analyse des Non-Conformités : Types de non-conformités les plus fréquents, fournisseurs concernés, délais de résolution.
Performance des Équipes : Taux de réalisation des contrôles.
Indicateurs Clés de Performance (KPI) pour l'IFS.
Gestion des Utilisateurs et Rôles :

Profils Utilisateurs : Opérateur, Assistant Qualité, Administrateur.
Permissions Granulaires : Chaque rôle a des droits d'accès et de modification spécifiques (ex: l'opérateur saisit, l'assistant qualité valide).
Expérience Utilisateur (Lovable Aspect) :

Interface Intuitive : Design épuré, navigation simple, minimale de clics pour les actions courantes.
Mobile-First : Optimisation pour une utilisation sur tablette en environnement de production (mention "Photo prise sur la tablette").
Visuels Clairs : Utilisation de codes couleurs (vert/orange/rouge) pour indiquer le statut des contrôles et non-conformités.
Feedback Instantané : Confirmation visuelle des saisies, alertes immédiates.
Robuste : Fonctionne même en cas de connexion internet limitée (mode hors-ligne avec synchronisation ultérieure, si pertinent pour l'environnement de production).
Personnalisation : Possibilité d'adapter les formulaires de contrôle si de nouveaux CP/CCP sont identifiés à l'avenir.
Critères de Succès pour le Projet :

Adoption par les Utilisateurs : Mesure de l'utilisation effective de l'application par les équipes.
Réduction des Non-Conformités : Impact sur la performance sanitaire de l'entreprise.
Gain de Temps : Évaluation du temps économisé sur la gestion HACCP manuelle.
Certification IFS : Contribution directe à l'obtention et au maintien de la certification.
Facilité d'Audit : Capacité à présenter rapidement et efficacement les preuves aux auditeurs.
Intégration du Document Fourni ("PLAN HACCP et CONTROLE") :

Le document fourni doit servir de référence et de base structurante pour le développement. Chaque ligne de votre tableau correspondra à un "type de contrôle" ou un "CP/CCP" dans l'application. Les colonnes définiront :

Les champs de saisie (ETAPE CRITIQUE/DANGER, CP et CCP).
Les logiques de validation (CONFORME SI...).
Les règles métier pour les alertes et actions (QUE FAIRE SI NON-CONFORME ?** PRINCIPE).
Les exigences de traçabilité (ENREGISTREMENT DES CONTRÔLES).
Les attributions de rôles (RESPONSABLE).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://breadsafe-pilot.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/36f836b7-62de-43ba-bf1b-dc2c9e8587d6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
