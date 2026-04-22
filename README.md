# Maison Félicien Pro — pro.maison-felicien.com

Stack : HTML statique + Vercel Serverless Functions + Supabase

## Structure
```
mf-pro/
├── index.html          ← Site pro complet (self-contained)
├── vercel.json         ← Config routing Vercel
├── api/
│   ├── chat.js         ← Proxy Anthropic (chat agent)
│   └── leads.js        ← Enregistrement leads Supabase
├── supabase-migration.sql ← Table leads à créer
└── README.md
```

## Déploiement — étapes dans l'ordre

### 1. Supabase — créer la table leads
- Ouvrir Supabase Dashboard > SQL Editor
- Coller et exécuter `supabase-migration.sql`

### 2. GitHub — créer un repo
```bash
cd mf-pro
git init
git add .
git commit -m "init: pro.maison-felicien.com"
git remote add origin https://github.com/TON_COMPTE/mf-pro.git
git push -u origin main
```

### 3. Vercel — nouveau projet
- vercel.com > Add New Project > Import Git Repository → mf-pro
- Framework Preset : **Other** (pas Next.js)
- Root Directory : `.` (racine)

### 4. Vercel — variables d'environnement
Settings > Environment Variables → ajouter :

| Name | Value | Environments |
|------|-------|-------------|
| `ANTHROPIC_API_KEY` | sk-ant-... | Production, Preview |
| `SUPABASE_URL` | https://xxx.supabase.co | Production, Preview |
| `SUPABASE_SERVICE_KEY` | eyJ... (service_role key) | Production, Preview |

### 5. Vercel — domaine custom
Settings > Domains > Add Domain → `pro.maison-felicien.com`
Vercel te donnera la valeur CNAME à copier.

### 6. Gandi DNS — CNAME
Gandi > Domaine maison-felicien.com > Enregistrements DNS > Ajouter :
```
Type  : CNAME
Nom   : pro
Valeur: cname.vercel-dns.com.
TTL   : 10800
```
Propagation : 5–30 min

## Récupérer les leads (Supabase)
Dashboard > Table Editor > leads
— ou requête SQL :
```sql
SELECT * FROM leads ORDER BY created_at DESC;
```

## Coûts
- Vercel : gratuit (Hobby plan, fonctions serverless incluses)
- Supabase : gratuit (Free tier)
- Anthropic Claude Haiku : ~$0.001 par conversation

## Outils internes (non listés)

- `/outils/catalogue-builder` — maquette de saisie catalogue (Phase 1, localStorage uniquement). URL non linkée depuis le site public. Pour la migration Next.js/Supabase prévue (Phase 2), voir `prompt_claude_code.md` à la racine du repo (non déployé).
