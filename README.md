# Coupe du Monde — Pronostics entre amis

Jeu de pronostics **100 % local** sur la Coupe du Monde 2026 : création de groupes privés, invitations par code,
pronostics (vainqueur + score), classement par groupe. **Sans pari d'argent, sans backend, sans service externe.**

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS (thème bleu/vert/orange)
- Données stockées dans le `localStorage` du navigateur

## Lancer en local

```bash
npm install
npm run dev
```

## Build & déploiement (GitHub Pages)

```bash
npm run build   # génère dist/
```

Le workflow `.github/workflows/deploy.yml` (à créer dans le repo, voir ci-dessous) build et publie sur GitHub Pages.
**Aucune variable d'environnement n'est nécessaire** (plus de Supabase).

### Créer le workflow (une seule fois, via l'interface GitHub)

Le token d'API n'a pas la scope `workflow`, le workflow doit être créé à la main :
repo → *Add file* → *Create new file* → nom `.github/workflows/deploy.yml` → contenu :

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

Puis dans **Settings → Pages** : source = *GitHub Actions*.

## Données

Les 104 matchs de la Coupe du Monde 2026 (résultats complets, source Wikipédia/FIFA) sont embarqués dans
`src/data/matches.ts`. Ils peuvent être modifiés depuis l'interface **Admin** (`/admin`) — le premier compte créé
est administrateur. L'admin peut aussi **exporter/importer** l'intégralité des données (comptes, groupes, matchs,
pronostics) en JSON via l'onglet *Données*.

## Limites du mode local

Les données vivent **par navigateur** : deux personnes sur deux appareils ne partagent pas les mêmes groupes.
Pour jouer ensemble, chaque participant doit :
1. se créer un compte sur son appareil,
2. rejoindre le groupe avec le **code d'invitation** (6 lettres) fourni par le créateur.

Le classement ne reflète donc que les membres du groupe **sur le même appareil**. C'est le mode "solo entre amis" :
chacun garde son propre tableau, et les codes servent à partager le contexte.

## Barème

- 5 pts : bon vainqueur (ou nul)
- +5 pts : score exact (donc 10 pts si les deux)
- ×2 sur la finale
- Prolongation / tirs au but : le score de base est celui des 90 min (les TA ne comptent pas pour le score exact).
