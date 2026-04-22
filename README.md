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

### Catalogue Builder — `/outils/catalogue-builder`

Outil admin de saisie / gestion du catalogue produits. **Backend Supabase** (projet `MF_pro`, ref `ckvwkwufdlydobjfwvwy`), auth admin, RLS strictes, multi-device.

- Login : `/outils/login.html` (email + mot de passe)
- Tables : `catalogue_categories`, `catalogue_produits`, `catalogue_pricing` (schéma `public`, préfixées pour isoler des autres features du projet Supabase)
- Auth : user Supabase Auth avec `app_metadata.role = 'admin'`. Les RLS policies refusent tout accès hors admin.
- Anon key : publique, hardcodée dans l'HTML (safe par design, RLS est le filet)
- Persistance : tout est en DB, aucun localStorage. Les modifications sont synchro immédiate via Supabase SDK.

Créer un admin supplémentaire (via dashboard Supabase → Authentication → Users → Add user) :
- Email + mot de passe
- Cocher "Auto-confirm user"
- Après création, éditer le user → onglet "Raw user meta data" → app_metadata : `{ "role": "admin" }`

Pour la migration future vers Next.js + admin TS + Storage + AI enrichissement, voir `.specs/prompt_claude_code.md` (non déployé par Vercel).
