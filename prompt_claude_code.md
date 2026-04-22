# Prompt Claude Code — Migration Catalogue Builder Maison Félicien

Copie tout ce qui suit dans Claude Code (VS Code) quand tu es dans le repo `pro.maison-felicien.com`. Le prompt est structuré pour être exécuté en une seule passe.

---

## CATALOGUE BUILDER — MIGRATION NEXT.JS + SUPABASE

### Context

- **Project** : pro.maison-felicien.com (Vercel, Next.js App Router, TypeScript, Tailwind CSS)
- **Database** : Supabase (déjà branché dans le repo, client dans `/lib/supabase.ts`)
- **Auth** : Supabase Auth, session admin côté serveur
- **Storage** : Supabase Storage pour les photos produit
- **Current state** : la maquette HTML standalone a été validée par le client. Voir `/docs/catalogue-builder-mockup.html` dans le repo (ou demander au client de la fournir). Les 5 onglets, les 5 catégories, le modèle produit-unique-packaging, et les 4 canaux de prix sont **figés** et ne doivent pas être modifiés sans validation explicite.
- **Design system** : identité Maison Félicien — polices Cormorant Garamond italic (titres) + Questrial (corps), palette Rose #8B3A43, Vert Olive #968A42, Poudré #E5B7B3, Blanc Cassé #F0F0E6, Marron Glacé #392D31. Toutes les variables sont déjà définies dans `tailwind.config.ts` du projet (si absentes, les ajouter).

### What to build

Une interface admin complète `/admin/catalogue` pour gérer le catalogue produits de Maison Félicien, avec :

1. Sidebar catégories + compteurs produits + stats
2. Vue grille des produits par catégorie
3. Modal édition en 5 onglets (Identité · Packaging · Tarifs · Photo · Logistique)
4. Upload photo vers Supabase Storage
5. Exports : catalogue HTML imprimable, fiche grossiste, CSV Ankorstore, JSON brut
6. Bouton "Enrichir avec l'IA" sur 4 champs textuels (via API Claude)

Une interface publique `/pro/catalogue` (protégée par code d'accès distributeur) sera traitée dans une tâche ultérieure — ne pas la créer maintenant.

### Database schema

Créer le fichier `/supabase/migrations/[timestamp]_catalogue.sql` avec :

```sql
-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  code VARCHAR(4) PRIMARY KEY,
  nom TEXT NOT NULL,
  subtitle TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (code, nom, subtitle, ordre) VALUES
  ('CC', 'Cub''Cakes', 'Format cube · fournée hebdomadaire numérotée', 1),
  ('CK', 'Cakes', 'Grands formats, tradition pâtissière', 2),
  ('CB', 'Cookies & Brownie', 'Gourmandises individuelles', 3),
  ('GR', 'Granola', 'Artisanal, petites productions', 4),
  ('AV', 'Marketing & PLV', 'Aide à la vente pour distributeurs', 5)
ON CONFLICT (code) DO NOTHING;

-- PRODUITS
CREATE TABLE IF NOT EXISTS produits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  categorie_code VARCHAR(4) NOT NULL REFERENCES categories(code),
  statut VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'pause', 'archive')),

  -- Identité
  nom TEXT NOT NULL,
  sous_titre TEXT,
  saison VARCHAR(30) DEFAULT 'permanente',
  desc_courte TEXT,
  desc_longue TEXT,
  rationnel_commercial TEXT,
  ingredients TEXT,
  allergenes TEXT,
  origine TEXT,
  recette TEXT,

  -- Marketing
  tags TEXT,
  profil_gout TEXT,
  photo_url TEXT, -- URL Supabase Storage

  -- Packaging (1 produit = 1 packaging dans notre modèle)
  pack_type VARCHAR(20),
  pack_libelle TEXT,
  pack_unites INTEGER DEFAULT 1,
  pack_moq INTEGER DEFAULT 1,
  pack_dlc INTEGER,
  pack_poids_g INTEGER,
  pack_long_cm NUMERIC(5,1),
  pack_larg_cm NUMERIC(5,1),
  pack_haut_cm NUMERIC(5,1),
  pack_ean VARCHAR(20),
  pack_sku VARCHAR(30),

  -- Tarifs (4 canaux)
  cost_ht NUMERIC(10,2),
  ppc_ttc NUMERIC(10,2),
  px_grossiste_ht NUMERIC(10,2),
  px_agent_ht NUMERIC(10,2),
  px_epicier_ht NUMERIC(10,2),
  px_plateforme_ht NUMERIC(10,2),

  -- Logistique
  expedition VARCHAR(30) DEFAULT 'frigo',
  franco_ht NUMERIC(10,2),
  delai_reassort INTEGER,
  paiement VARCHAR(30) DEFAULT '30fdm',
  reprise_invendus VARCHAR(30) DEFAULT 'lancement',
  notes_logistique TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_produits_categorie ON produits(categorie_code);
CREATE INDEX idx_produits_statut ON produits(statut);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_produits_updated
  BEFORE UPDATE ON produits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;

-- Lecture publique (pour le futur /pro/catalogue, protégé par code côté app)
CREATE POLICY "categories lecture publique" ON categories
  FOR SELECT USING (true);

CREATE POLICY "produits lecture publique" ON produits
  FOR SELECT USING (true);

-- Écriture admin uniquement
CREATE POLICY "categories admin write" ON categories
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "produits admin write" ON produits
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- STORAGE BUCKET pour les photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalogue-photos', 'catalogue-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Photos publiques lecture" ON storage.objects
  FOR SELECT USING (bucket_id = 'catalogue-photos');

CREATE POLICY "Photos admin upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'catalogue-photos'
    AND auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Photos admin delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'catalogue-photos'
    AND auth.jwt() ->> 'role' = 'admin'
  );
```

Important : le rôle `admin` doit être assigné à l'utilisateur via le JWT. Si ce n'est pas déjà fait dans le projet, ajouter une colonne `role` dans `auth.users` metadata et la peupler pour pro@maison-felicien.com.

### File structure to create

```
/app/admin/catalogue/
  layout.tsx                    ← Auth check, redirect si pas admin
  page.tsx                      ← Page principale (sidebar + grille produits)
  actions.ts                    ← Server actions CRUD + upload photo

/app/api/catalogue/
  enrich/route.ts               ← POST Claude API pour enrichissement IA
  export/route.ts               ← GET formats : html-catalog, html-grossiste, csv-ankorstore, json

/components/catalogue/
  Sidebar.tsx                   ← Liste catégories + stats
  ProductGrid.tsx               ← Grille de cartes produit
  ProductCard.tsx               ← Une carte produit
  ProductModal.tsx              ← Modal édition 5 onglets
  PanelIdentite.tsx             ← Onglet 1
  PanelPackaging.tsx            ← Onglet 2
  PanelTarifs.tsx               ← Onglet 3 (calcul marge live côté client)
  PanelPhoto.tsx                ← Onglet 4 (upload Supabase Storage)
  PanelLogistique.tsx           ← Onglet 5
  TabsNav.tsx                   ← Navigation 5 onglets (grid 5 cols, responsive)
  PanelNav.tsx                  ← Boutons prev/next au bas de chaque panel
  ExportMenu.tsx                ← Bouton + modale exports
  AIEnrichButton.tsx            ← Bouton "Enrichir IA"

/lib/
  supabase-admin.ts             ← Client Supabase avec service_role (server-side)
  catalogue-types.ts            ← Types TypeScript : Categorie, Produit
  catalogue-generators.ts       ← Fonctions serveur qui génèrent HTML/CSV
```

### TypeScript types (`/lib/catalogue-types.ts`)

```typescript
export type Categorie = {
  code: string
  nom: string
  subtitle: string | null
  ordre: number
}

export type Produit = {
  id: string
  code: string
  categorie_code: string
  statut: 'actif' | 'pause' | 'archive'

  nom: string
  sous_titre: string | null
  saison: string
  desc_courte: string | null
  desc_longue: string | null
  rationnel_commercial: string | null
  ingredients: string | null
  allergenes: string | null
  origine: string | null
  recette: string | null

  tags: string | null
  profil_gout: string | null
  photo_url: string | null

  pack_type: string | null
  pack_libelle: string | null
  pack_unites: number
  pack_moq: number
  pack_dlc: number | null
  pack_poids_g: number | null
  pack_long_cm: number | null
  pack_larg_cm: number | null
  pack_haut_cm: number | null
  pack_ean: string | null
  pack_sku: string | null

  cost_ht: number | null
  ppc_ttc: number | null
  px_grossiste_ht: number | null
  px_agent_ht: number | null
  px_epicier_ht: number | null
  px_plateforme_ht: number | null

  expedition: string
  franco_ht: number | null
  delai_reassort: number | null
  paiement: string
  reprise_invendus: string
  notes_logistique: string | null

  created_at: string
  updated_at: string
}

export type ProduitInput = Omit<Produit, 'id' | 'created_at' | 'updated_at'>
```

### Server actions (`/app/admin/catalogue/actions.ts`)

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase-admin'
import { ProduitInput } from '@/lib/catalogue-types'
import { revalidatePath } from 'next/cache'

export async function listCategoriesAction() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('ordre')
  if (error) throw error
  return data
}

export async function listProduitsAction() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('produits')
    .select('*')
    .order('code')
  if (error) throw error
  return data
}

export async function generateCodeAction(categorieCode: string): Promise<string> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('produits')
    .select('code')
    .like('code', `${categorieCode}-%`)
  const existing = new Set((data || []).map(p => p.code))
  let n = 1
  while (existing.has(`${categorieCode}-${String(n).padStart(3, '0')}`)) n++
  return `${categorieCode}-${String(n).padStart(3, '0')}`
}

export async function upsertProduitAction(produit: ProduitInput & { id?: string }) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('produits')
    .upsert(produit)
    .select()
    .single()
  if (error) throw error
  revalidatePath('/admin/catalogue')
  return data
}

export async function deleteProduitAction(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('produits').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/catalogue')
}

export async function uploadPhotoAction(file: File, produitCode: string): Promise<string> {
  const supabase = createAdminClient()
  const ext = file.name.split('.').pop()
  const path = `${produitCode}-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('catalogue-photos')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('catalogue-photos').getPublicUrl(path)
  return data.publicUrl
}
```

### API routes

**`/app/api/catalogue/enrich/route.ts`** — Enrichissement IA Claude

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FIELD_PROMPTS = {
  'desc-courte': `Rédige une description courte de ~30 mots pour ce produit de pâtisserie artisanale. Ton sobre, premium, Maison Félicien (univers Art Nouveau / botanique). Pas d'emojis. Pas de superlatifs vides. Une phrase d'accroche qui situe le profil de goût et l'origine.`,
  'desc-longue': `Rédige une description longue de ~100 mots pour le catalogue. Storytelling, technique, émotion. Mentionne l'ingrédient signature et son origine. Ton Maison Félicien : élégant, précis, jamais surjoué.`,
  'rationnel': `Rédige 3 bullets d'argumentaire commercial pour un distributeur B2B qui envisage de référencer ce produit. Un bullet par angle : différenciation marché, rotation/marge, comportement client final. Format: "• Argument 1\\n• Argument 2\\n• Argument 3". Concret, chiffré quand possible.`,
  'recette': `Rédige un court storytelling de recette (~60 mots) : la rencontre avec le producteur de l'ingrédient signature, un détail technique, l'inspiration. Ton narratif, pas commercial.`
}

export async function POST(req: NextRequest) {
  const { field, nom, ingredients, origine } = await req.json()
  if (!FIELD_PROMPTS[field]) return NextResponse.json({ error: 'field inconnu' }, { status: 400 })

  const prompt = `Produit : ${nom}\nIngrédients : ${ingredients || 'non renseignés'}\nOrigine : ${origine || 'non renseignée'}\n\n${FIELD_PROMPTS[field]}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return NextResponse.json({ text })
}
```

**`/app/api/catalogue/export/route.ts`** — Route unique pour tous les exports

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { listProduitsAction, listCategoriesAction } from '@/app/admin/catalogue/actions'
import { buildCatalogHTML, buildGrossisteHTML, buildAnkorstoreCSV } from '@/lib/catalogue-generators'

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get('format') || 'json'
  const categories = await listCategoriesAction()
  const produits = await listProduitsAction()
  const actifs = produits.filter(p => p.statut === 'actif')

  if (format === 'json') {
    return NextResponse.json({ categories, produits })
  }

  if (format === 'html-catalog') {
    const html = buildCatalogHTML(categories, actifs)
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  if (format === 'html-grossiste') {
    const withPrice = actifs.filter(p => p.px_grossiste_ht && p.px_grossiste_ht > 0)
    const html = buildGrossisteHTML(categories, withPrice)
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  if (format === 'csv-ankorstore') {
    const csv = buildAnkorstoreCSV(categories, actifs)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ankorstore-${new Date().toISOString().slice(0,10)}.csv"`
      }
    })
  }

  return NextResponse.json({ error: 'format inconnu' }, { status: 400 })
}
```

### Generators (`/lib/catalogue-generators.ts`)

Porter la fonction `buildCatalogHTML()` du mockup (dans le fichier HTML standalone) vers ce module TS. Conserver :
- L'identité visuelle Maison Félicien (Cormorant + Questrial, palette rose/vert/poudré)
- La cover page
- Les sections par catégorie
- La carte produit (photo, code, nom, sous-titre, desc courte, origine, format, tarif grossiste si présent)
- L'outro avec coordonnées

`buildGrossisteHTML()` = même structure mais **n'affiche que** les produits avec `px_grossiste_ht > 0`, et ajoute en intro un encart avec les conditions logistiques communes (DLC, paiement, franco, reprise invendus).

`buildAnkorstoreCSV()` = export au format import Ankorstore :
```
product_name, product_code, category, description, wholesale_price_ht, retail_price_ttc, moq, dlc_days, ingredients, allergens
```

### UI component rules

- Design system strict Maison Félicien (voir maquette HTML)
- 5 onglets en `grid-template-columns: repeat(5, 1fr)` (pas de scroll horizontal)
- Chaque panel termine par une nav prev/next avec dots de progression
- Modal édition : slide-in latéral (max-width 720px), sticky header + footer
- Toast pour feedback (sauvegarde, erreur)
- Photo upload drag & drop ou click → `/components/catalogue/PanelPhoto.tsx`
- Bouton AI : disabled pendant fetch, gradient rose→vert, texte "✦ Enrichir avec l'IA"

### Migration des données de la maquette

Le client a exporté un JSON depuis la maquette HTML (bouton "Export JSON" en haut). Ce JSON contient `{ categories, produits }`. Créer un script `/scripts/import-catalogue-json.ts` qui prend un fichier JSON en argument et l'insère dans Supabase :

```bash
pnpm tsx scripts/import-catalogue-json.ts ./catalogue-mf-2026-04-22.json
```

Le script doit :
1. Upsert les catégories sur la colonne `code`
2. Upsert les produits sur la colonne `code`
3. Photos : les photos en base64 du JSON doivent être uploadées dans Supabase Storage → remplacer le champ `photo` (base64) par `photo_url` (URL publique)
4. Logger le nombre d'insertions/updates et les erreurs

### Environment variables (ajouter dans `.env.local`)

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_SERVICE_ROLE_KEY=...
```

Documenter dans le README comment obtenir ces clés.

### Acceptance criteria

- [ ] Migration SQL passe sans erreur
- [ ] `/admin/catalogue` est protégée (redirect si non authentifié admin)
- [ ] La liste des 5 catégories s'affiche dans la sidebar avec le bon compteur
- [ ] Cliquer une carte ouvre la modal avec les 5 onglets en `grid 1fr*5`
- [ ] Les 5 onglets ont tous leur formulaire complet (voir maquette pour les champs exacts)
- [ ] Créer un produit génère un code auto (format `CC-001`)
- [ ] Upload photo → URL Supabase Storage stockée dans `photo_url`, affichée dans la carte
- [ ] Le calcul de marge live fonctionne dans l'onglet Tarifs (pure côté client, pas d'appel DB)
- [ ] Bouton "Enrichir IA" appelle `/api/catalogue/enrich`, remplit le champ, permet édition manuelle
- [ ] Le menu Exports fonctionne : catalogue HTML (nouvel onglet), fiche grossiste (nouvel onglet), CSV Ankorstore (téléchargement), JSON (téléchargement)
- [ ] Le script `import-catalogue-json.ts` importe un JSON produit par la maquette HTML sans perte de données
- [ ] Le design reste identique à la maquette HTML (mêmes polices, mêmes couleurs, même ergonomie navigation 5 onglets + prev/next)

### Do NOT

- Ne crée pas de table `packagings` séparée. Dans notre modèle, **1 produit = 1 packaging intégré**. Les champs `pack_*` vivent sur la table `produits`.
- Ne crée pas `/pro/catalogue` (interface publique distributeur). C'est une tâche ultérieure.
- Ne modifie pas les 5 codes catégorie (`CC`, `CK`, `CB`, `GR`, `AV`) ni leur ordre.
- N'utilise pas de composants UI tiers pour la modal ou les onglets (pas de Radix, pas de Headless UI) — recode avec Tailwind + `useState` pour rester cohérent avec le reste du projet.
- N'importe pas de librairies PDF (Puppeteer, pdfkit, react-pdf). Pour l'instant, exports HTML uniquement → le client imprime en PDF depuis son navigateur (Ctrl+P). PDF serveur = tâche ultérieure si besoin.
- Ne remplace pas le prix `0.00` par `null` côté UI : si le champ est vide, laisser vide dans l'input. Le server action stocke `null` si le champ est vide.

### Output

1. Tous les fichiers créés avec leur contenu complet
2. La migration SQL dans `/supabase/migrations/`
3. Le README mis à jour avec la section "Catalogue Builder" (setup, env vars, comment lancer le script d'import)
4. Un rapport final listant : fichiers créés, tests effectués (si possible en local), points d'attention pour le déploiement Vercel
