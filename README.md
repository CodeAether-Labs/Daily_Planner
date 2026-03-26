# Daily Planner — MVP

Plateforme web pour gérer des tâches quotidiennes (titre + heure) — cible étudiants.

**Rappels** : **5 minutes avant** l’heure du créneau (tâche non terminée), alerte dans la page + option notification navigateur. **Récurrence** : tâche « une fois » (jour de création) ou **chaque semaine** avec jours cochés (lun–dim). La page doit rester ouverte pour le minuteur (pas de service worker dans ce MVP).

## Structure des dossiers

```
Daily Planner/
├── README.md                 # Ce fichier (lancement + arborescence)
├── vercel.json               # Build du client pour Vercel
├── render.yaml               # Optionnel : API sur Render
├── .gitignore
├── docs/
│   ├── CAHIER_DES_CHARGES.md # Exigences fonctionnelles MVP
│   └── ARCHITECTURE.md       # Architecture technique
├── server/                   # API REST (Node + Express)
│   ├── package.json
│   ├── data/                 # Données locales (tasks.json généré)
│   │   └── .gitkeep
│   └── src/
│       ├── index.js          # Routes / validation
│       └── tasksStore.js     # Persistance JSON
└── client/                   # Interface (React + Vite)
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── public/
    │   └── favicon.svg          # Icône onglet (à remplacer pour ton identité)
    └── src/
        ├── main.jsx
        ├── index.css
        ├── brand-theme.css      # Surcharge couleurs / typo (voir commentaires)
        ├── branding.js          # Nom, accroche, texte notifications
        ├── api.js
        ├── useTaskReminders.js
        ├── App.jsx
        └── App.css
```

## Prérequis

- **Node.js** 18+ (idéalement LTS) avec `npm`.

## Étapes pour lancer le projet

### 1. Installer les dépendances

**Depuis la racine du projet** (`Daily Planner/`), tu peux tout installer d’un coup :

```bash
npm run install:all
```

Ou séparément :

```bash
cd server && npm install
cd ../client && npm install
```

**Erreur fréquente** : utiliser `cd server & npm run dev` (avec `&`) — la commande `npm` s’exécute alors **hors** de `server/` et ne trouve pas `package.json`. Il faut **`&&`** enchaînant les commandes : `cd server && npm run dev`.

### 2. Démarrer l’API

Soit depuis la racine :

```bash
npm run dev:server
```

Soit :

```bash
cd server && npm run dev
```

L’API écoute par défaut sur **http://localhost:3001** (variable d’environnement optionnelle `PORT`).

### 3. Démarrer l’interface web (autre terminal)

Depuis la racine :

```bash
npm run dev:client
```

Ou :

```bash
cd client && npm run dev
```

Ouvre **http://localhost:5173** : le proxy Vite redirige `/api` vers le serveur sur le port 3001.

### Build de production (frontend)

```bash
cd client
npm run build
```

Les fichiers statiques sont générés dans `client/dist/`.

## Hébergement (Vercel + API)

**Vercel** sert le **frontend** (fichiers dans `client/dist`). L’**API Express** ne tourne pas de façon fiable sur les fonctions serverless avec un fichier JSON persistant : il faut l’héberger **à part** (ex. [Render](https://render.com), Railway, Fly.io).

### 1. Déployer l’API (exemple Render)

1. Pousse le dépôt sur GitHub.
2. Sur Render : **New** → **Web Service**, branche le repo.
3. Paramètres suggérés :
   - **Build** : `npm install --prefix server`
   - **Start** : `npm start --prefix server`
   - **Instance** : gratuit possible (le service « dort » après inactivité ; le disque peut être réinitialisé — les tâches peuvent disparaître ; pour de la vraie persistance, prévoir une base ou un disque persistant).
4. Note l’URL publique, ex. `https://daily-planner-api-xxxx.onrender.com`.

Tu peux aussi utiliser le fichier [`render.yaml`](render.yaml) (Blueprint) si Render le propose.

### 2. Déployer le client sur Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → importe le **même** repo.
2. Laisse la racine du projet à la racine du dépôt (le fichier [`vercel.json`](vercel.json) définit déjà `buildCommand` / `outputDirectory`).
3. **Variables d’environnement** (Production, et Preview si tu veux) :
   - `VITE_API_URL` = l’URL de ton API **sans** slash final, ex. `https://daily-planner-api-xxxx.onrender.com`
4. **Deploy**. Le build embarque `VITE_*` : si tu changes l’URL de l’API, relance un déploiement.

En local, ne mets pas `VITE_API_URL` : le proxy Vite envoie `/api` vers le port 3001. Voir [`client/.env.example`](client/.env.example).

L’API autorise déjà **CORS** (`cors()` côté Express). La route `GET /` renvoie un petit JSON pour les health checks.

## Documentation

- [Cahier des charges](docs/CAHIER_DES_CHARGES.md)
- [Architecture](docs/ARCHITECTURE.md)
