# World Cup App - Pronostics & Groupes

Application web de pronostics Coupe du Monde 2026 permettant aux utilisateurs de créer des groupes privés, faire des prédictions sur les matchs et compétir entre amis.

## 🌟 Fonctionnalités

- **Groupes privés** : Créez un groupe et invitez vos amis par email
- **Pronostics** : Prédisez le gagnant et le score des matchs
- **Classements en temps réel** : Suivez qui mène dans chaque groupe
- **Score en direct** : Mise à jour automatique via API FIFA (10 req/jour)
- **Interface moderne** : Thème officiel FIFA (bleu/vert/orange)
- **Admin dashboard** : Contrôle total du site

## 🛠 Stack technique

| Composant | Technology |
|-----------|------------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Supabase (Postgres + Auth + REST API) |
| Hosting | GitHub Pages (frontend) + Supabase (backend) |
| Data Sync | GitHub Actions (cron every 15min) |

## 🚀 Déploiement

### 1. Créer un projet Supabase
- Allez sur [supabase.com](https://supabase.com)
- Créez un nouveau projet
- Copiez l'URL et l'API key (anon key)

### 2. Initialiser la base de données
Exécutez `db/seed.sql` dans le **SQL Editor** de Supabase.

### 3. Déployer sur GitHub Pages
1. Activez **GitHub Pages** dans Settings > Pages
2. Build du frontend : `cd frontend && npm install && npm run build`

## 📁 Structure du repo

```
coupe-du-monde-pronostics/
├── assets/           # Logo + favicon SVG
├── db/               # Schema SQL + seed data
├── docs/             # Documentation admin/setup
├── frontend/         # Code source React/Vite
│   ├── src/
│   │   ├── components/  # Header, MatchCard
│   │   ├── pages/       # Home, Groups, Matches, Leaderboard
│   │   └── store.ts     # Zustand state management
│   └── vite.config.js
└── scripts/          # Sync script + Admin CLI
```

## 🌐 Admin Dashboard

L'interface admin est accessible via `/admin` (pour les utilisateurs `is_admin=true`).

Fonctionnalités :
- Gestion des utilisateurs
- Gestion des groupes
- Synchronisation manuelle des matchs

See `docs/AdminGuide.md` pour plus de détails.

## 🔌 API Externe

L'application utilise l'API Sportmonks (free tier: 10 req/jour).

Configurez votre clé API dans GitHub Secrets si vous dépassez le quota.

---

**Built with ❤️ for World Cup fans**
