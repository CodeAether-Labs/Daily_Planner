# Cahier des charges — Daily Planner (MVP)

## 1. Contexte et objectif

**Daily Planner** est une plateforme web destinée aux **étudiants** pour organiser leurs **tâches quotidiennes** (cours, révisions, rendez-vous) avec une prise en charge minimale : titre et heure.

**Objectif du MVP** : permettre d’ajouter, consulter, cocher comme terminé et supprimer des tâches, sans authentification ni multi-utilisateur.

## 2. Public cible

- Étudiants qui veulent une liste simple du jour, triée par heure.

## 3. Périmètre fonctionnel (MVP)

| ID | Fonction | Description |
|----|----------|-------------|
| F1 | Ajouter une tâche | Saisie **titre** (obligatoire, texte) et **heure** (format 24 h, `HH:mm`). |
| F2 | Liste des tâches | Affichage de toutes les tâches, **triées par heure** puis par date de création. |
| F3 | Marquer terminée | Bascule **terminée / non terminée** (état booléen persisté). |
| F4 | Supprimer une tâche | Suppression définitive d’une entrée. |
| F5 | Rappels | Alerte **5 minutes avant** l’heure du créneau (UI + notification navigateur optionnelle), tâche non terminée. |
| F6 | Répétition | **Une fois** (jour de création uniquement) ou **chaque semaine** avec un ou plusieurs jours cochés (`repeatDays`, 0=dim … 6=sam comme JS). |

## 4. Hors périmètre MVP

- Comptes utilisateurs, authentification, partage.
- Calendrier par dates libres, récurrence autre que hebdomadaire, push serveur.
- Catégories, pièces jointes, sous-tâches.
- Application mobile native.

## Contraintes techniques (MVP)

- API REST JSON, CORS ouvert pour le développement (`localhost`).
- Persistance locale côté serveur (fichier JSON).
- Interface utilisable sur mobile (viewport, zones tactiles raisonnables).

## 5. Règles métier

- **Titre** : chaîne non vide après trim ; longueur côté UI limitée (ex. 200 caractères).
- **Heure** : format `HH:mm` (00:00–23:59).
- **Tri liste** : `time` croissant, puis `createdAt` croissant.
- **Identifiant** : UUID v4 côté serveur à la création.
- **Répétition** : `repeatWeekly` booléen ; si `true`, `repeatDays` tableau d’entiers 0–6 non vide ; sinon `repeatDays` vide côté stockage.
- **Sans répétition** : rappel et sens « ce jour-là » = **date locale de `createdAt`**.

## 6. API (contrat MVP)

| Méthode | Route | Action |
|---------|--------|--------|
| `GET` | `/api/tasks` | Liste des tâches (tri appliqué côté serveur dans l’implémentation actuelle). |
| `POST` | `/api/tasks` | Corps `{ "title", "time", "repeatWeekly"?, "repeatDays"? }` → création, `201` + objet tâche (`repeatWeekly` / `repeatDays` normalisés). |
| `PATCH` | `/api/tasks/:id` | Corps `{ "completed": boolean }` → mise à jour, `404` si inconnu. |
| `DELETE` | `/api/tasks/:id` | Suppression, `204` si OK, `404` si inconnu. |

Erreurs : `400` (validation), `404` (ressource), JSON `{ "error": "message" }` si applicable.

## 7. Critères d’acceptation (résumé)

- Un utilisateur peut enchaîner : ajouter → voir la liste → cocher terminé → supprimer, sans recharger la page de manière forcée.
- Après redémarrage du serveur, les tâches restent si le fichier de données est conservé.

## 8. Évolutions possibles (post-MVP)

- Auth + base par utilisateur ; calendrier par jour ; filtres (fait / à faire) ; export ICS ; rappels avec app fermée (service worker / push).
