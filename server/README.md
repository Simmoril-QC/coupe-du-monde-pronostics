# Serveur — Pronostics multi-sports (Express + SQLite)

Backend auto-hébergé, zéro dépendance tierce (seulement `express` et `nodemailer`,
+ SQLite intégré à Node 22+ via `node:sqlite`).

## Lancement

```bash
# Node >= 22.5 requis (node:sqlite intégré)
node --version
npm install
npm start            # écoute sur le port 8080
```

En développement :

```bash
npm run dev          # auto-restart (si node --watch dispo, sinon npm start)
```

Le front en dev (Vite) proxy automatiquement `/api` → `http://localhost:8080`.

## Configuration (`server/.env`)

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `8080` | Port d'écoute |
| `DB_PATH` | `./app.sqlite` | Fichier SQLite (créé + seedé au 1er lancement) |
| `APP_URL` | `http://localhost:5173` | URL du front (liens de magic link) |
| `CORS_ORIGIN` | `*` (tout passe) | Origines autorisées, ex. `https://simmoril-qc.github.io` |
| `SMTP_HOST` | — | Hôte SMTP (Gmail, Outlook, OVH…). Sans ça : les liens sont **affichés dans la console** |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` / `SMTP_PASS` | — | Identifiants (Gmail : mot de passe applicatif) |
| `SMTP_FROM` | `SMTP_USER` | Expéditeur des emails |

### Exemple Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=toncompte@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx   # mot de passe applicatif
APP_URL=https://simmoril-qc.github.io/coupe-du-monde-pronostics
CORS_ORIGIN=https://simmoril-qc.github.io
```

## Front en production (GitHub Pages)

Le front est statique (GitHub Pages) et appelle le back via `VITE_API_URL`.
Dans GitHub : **Settings → Secrets and variables → Actions → Variables**,
ajouter `VITE_API_URL=https://votre-serveur` (le workflow passe ce secret au build).

Le back doit être exposé (VPS, Raspberry Pi, PC toujours allumé + ngrok/cloudflared).
Le premier compte créé est **administrateur** (page /admin).

## Données

`seeds.json` : 296 matchs pré-remplis (4 sports : football H/F, basket H/F).
Seedé une seule fois au premier lancement (table `meta`). Pour re-seeder :
`POST /api/admin/reset` (admin) — efface tout et restaure les matchs.

## Tests

```bash
# serveur sur un port/DB propres
PORT=8999 DB_PATH=./test.sqlite node index.js &
BASE=http://localhost:8999 node test_api.js test.log
```

## Endpoints

- `GET /api/health`
- `GET /api/state` (public : matchs + sports ; groupes/pronostics si connecté)
- `POST /api/auth/request` `{email, name}` → email de connexion (magic link)
- `POST /api/auth/verify` `{token}` → `{user, sessionToken}`
- `GET /api/me`, `POST /api/auth/logout`
- `POST /api/groups` `{name, sport, description?}` · `POST /api/groups/join` `{code}`
- `POST /api/groups/:id/leave` · `POST /api/groups/:id/invite` `{emails:[...]}`
- `POST /api/members/:groupId/respond` `{status}` · `POST /api/members/:groupId/remove` `{userId}`
- `POST /api/predictions` `{group_id, match_id, predicted_winner, home_score, away_score}`
- `GET /api/leaderboard?groupId=`
- `GET /api/matches?sport=`
- Admin (`/api/admin/*`) : users (admin/delete), groups, matches (add/patch/delete), invitations, reset, export
