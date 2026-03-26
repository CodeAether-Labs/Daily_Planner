# Architecture — Daily Planner (MVP)

## 1. Vue d’ensemble

Application **découplée** en deux artefacts :

- **Backend** : API HTTP REST (Node.js + Express) qui expose les ressources « tâches » et persiste dans un fichier JSON.
- **Frontend** : SPA légère (React + Vite) qui consomme l’API via `fetch`, avec proxy de développement vers l’API.

```
┌─────────────────┐     HTTP (JSON)      ┌─────────────────┐
│  Navigateur     │ ◄──────────────────► │  API Express    │
│  (React + Vite) │   /api/tasks…        │  (Node)         │
└─────────────────┘                      └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │ tasks.json        │
                                        │ (fichier disque)  │
                                        └─────────────────┘
```

## 2. Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Runtime backend | Node.js (ES modules) | Serveur HTTP |
| Framework HTTP | Express | Routes, JSON, CORS |
| Persistance | Fichier `server/data/tasks.json` | Liste de tâches (via `tasksStore.js`) |
| Frontend | React 18 | UI composants |
| Build / dev front | Vite 6 | HMR, proxy `/api` → `localhost:3001` |
| Communication | `fetch` + REST | Pas de WebSocket pour le MVP |

## 3. Modèle de données (tâche)

```json
{
  "id": "uuid",
  "title": "string",
  "time": "HH:mm",
  "completed": false,
  "createdAt": "ISO-8601"
}
```

## 4. Responsabilités des modules

### Backend (`server/`)

- `src/index.js` : montage Express, validation (`title`, `time` / `completed`), orchestration CRUD.
- `src/tasksStore.js` : lecture/écriture atomique du fichier JSON (création du dossier `data/` si besoin).
- `data/tasks.json` : stockage généré à l’exécution (non versionné de préférence).

### Frontend (`client/`)

- `src/api.js` : encapsulation des appels REST et gestion d’erreurs HTTP.
- `src/App.jsx` : état local (liste, formulaire), appels API, rendu liste + actions.
- `vite.config.js` : `server.proxy` pour que le front en dev appelle `/api` sans CORS problématique.

## 5. Flux principaux

**Création** : formulaire → `POST /api/tasks` → fichier mis à jour → `GET /api/tasks` (rafraîchissement liste).

**Toggle terminé** : clic → `PATCH /api/tasks/:id` → rafraîchissement.

**Suppression** : clic → `DELETE /api/tasks/:id` → rafraîchissement.

## 6. Sécurité et production (hors MVP strict)

- L’API n’implémente pas d’auth : à ne pas exposer tel quel sur Internet sans garde (reverse proxy, auth, rate limit).
- Pour la prod : servir le build statique Vite derrière le même domaine ou config CORS explicite ; migrer la persistance vers une vraie base (PostgreSQL, SQLite, etc.).

## 7. Structure des dossiers (référence)

Voir la section correspondante dans le `README.md` à la racine du dépôt.
