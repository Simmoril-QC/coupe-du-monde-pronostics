# Coupe du Monde — Pronostics entre amis

Jeu de pronostics Coupe du Monde 2026 : création de groupes privés, invitations par email, pronostics (vainqueur + score), classement par groupe. **Sans pari d'argent.**

## Stack

- **Front** : React + Vite + Tailwind CSS (thème FIFA bleu/vert/orange)
- **Backend** : Supabase (Postgres + Auth magic link + RLS)
- **Hébergement** : GitHub Pages (build Vite via GitHub Actions)
- **Sync matchs** : GitHub Actions (manuel ou API Sportmonks si clé fournie)

## Structure

```
├── index.html              # Entrée Vite
├── src/
│   ├── App.tsx             # Routes
│   ├── main.tsx            # Router basename /coupe-du-monde-pronostics
│   ├── components/Header.tsx
│   ├── pages/              # Home, Login, Groups, Matches, Leaderboard, Admin
│   └── lib/                # supabase.ts, AuthContext.tsx, types.ts
├── public/                 # logo.svg, favicon.svg (copiés dans le build)
├── db/
│   ├── seed.sql            # Schema complet + seed (à exécuter en premier)
│   └── supabase-triggers.sql  # Trigger : profil auto à l'inscription (2e)
├── scripts/sync-matches.js # Sync optionnelle via API Sportmonks
└── .github/workflows/deploy.yml  # Build + déploiement GitHub Pages
```

## Mise en service

1. **Supabase** : exécuter `db/seed.sql` puis `db/supabase-triggers.sql` dans le SQL Editor.
2. **Auth** : dans le tableau de bord Supabase → Authentication → Providers → activer **Email**.
   Ajouter l'URL de base GitHub Pages dans **Site URL** et dans **Redirect URLs** :
   `https://<votre-user>.github.io/coupe-du-monde-pronostics/*`
3. **GitHub** → Settings → Secrets and variables → Actions :
   - `VITE_SUPABASE_ANON_KEY` (secret) : la clé `anon public` du projet
   - `VITE_SUPABASE_URL` (variable, ou secret) : l'URL du projet
   - *(optionnel)* `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SPORTMONKS_API_KEY` pour la sync auto
4. **Push** sur `main` → le workflow `deploy.yml` build et déploie.
5. **Admin** : une fois inscrit, exécuter dans le SQL Editor :
   `UPDATE users SET is_admin = true WHERE email = 'votre@email.com';`
   L'interface `/admin` devient alors accessible.

## Règles du jeu

- +5 pts : bon résultat (vainqueur/nul)
- +5 pts bonus : score exact
- +2 pts bonus : bonne prédiction de la finale

## Développement local

```bash
cp .env.local.example .env.local   # remplir avec vos clés Supabase
npm install
npm run dev                        # http://localhost:3000
```

> NB : en local, le base de Vite est `/coupe-du-monde-pronostics/` (comme sur Pages).
> Pour dev sans ce préfixe, retirer `base` dans `vite.config.ts` et le `basename` dans `src/main.tsx`.
