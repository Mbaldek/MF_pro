# Prompt — Recherche & chiffrage des champs manquants du catalogue Maison Félicien

À coller dans un agent Claude **avec accès web** (claude.ai en mode "Research" ou
agent outillé de WebSearch / WebFetch). Le JSON actuel (16 produits) est inclus à la fin.
La mission : remplir les champs financiers et logistiques manquants en s'appuyant
sur des **benchmarks réels** du marché pâtisserie artisanale premium française et
européenne, puis livrer deux artefacts :

1. Un **JSON enrichi** prêt à importer dans le catalogue builder.
2. Un **rapport markdown** qui justifie chaque valeur avec sources URL.

---

## CONTEXTE MAISON FÉLICIEN

- Maison de pâtisserie artisanale premium à Paris.
- Positionnement : univers Art Nouveau / botanique, storytelling origines, ingrédients IGP tracés (chocolat Arriba Équateur, pistache Bronte IGP, noisettes Piémont IGP, citron de Menton IGP, matcha Uji cérémonial, etc.).
- Canaux B2B visés : **Grossistes** (achat-stock-revente), **Agents commerciaux** (commissionnés ~12%), **Épiciers directs** (achètent en direct chez la Maison), **Plateformes B2B** (Ankorstore, Faire).
- Fournée hebdomadaire numérotée (DLC courtes pour frais : 5-7j, DLC longues pour sec : 90j granola).
- Positionnement prix **haut de gamme** mais accessible — se compare à Maison Mulot, Land&Monkeys, Liberté, Mori Yoshida, Popelini, L'Éclair de Génie, Gâteaux Thoumieux, Jean-Paul Hévin (pour le chocolaté), Carton, Du Pain et des Idées, Boneshaker, Bo&Mie.

## CE QUI EST DÉJÀ RENSEIGNÉ

Chaque produit a déjà : `code`, `categorie`, `nom`, `sousTitre`, `descCourte`, `rationnel`, `ingredients`, `allergenes`, `origine`, `tags`, `gout`, `packType`, `packLibelle`, `packUnites`, `packMOQ`, `packDLC`, `packPoids`, `packL/W/H`, `expedition`, `delai`, `paiement`, `reprise`.

**Ne modifie PAS ces champs**, sauf si une recherche révèle une erreur flagrante (dimensions incohérentes, DLC aberrante). Dans ce cas, **signale-le** dans le rapport et demande confirmation.

## CHAMPS À REMPLIR (aujourd'hui à `null`)

| Champ | Définition | Unité |
|---|---|---|
| `cost` | Coût de revient HT par pack (matière + main d'œuvre + emballage + quote-part charges) | € / pack |
| `ppc` | Prix Public Conseillé TTC en boutique | € / pack |
| `pxGrossiste` | Prix HT canal Grossiste | € / pack |
| `pxAgent` | Prix HT canal Agent commercial | € / pack |
| `pxEpicier` | Prix HT canal Épicier direct | € / pack |
| `pxPlateforme` | Prix HT canal Plateforme B2B (Ankorstore / Faire) | € / pack |
| `franco` | Franco de port HT (montant de commande minimum pour livraison offerte) | € |

Laisse `packEAN` à `""` (les GTIN seront attribués plus tard par le fournisseur).

## MÉTHODOLOGIE DE RECHERCHE

### 1. Benchmark PPC (prix public TTC boutique)

Cherche le prix de produits **comparables en format, positionnement et ingrédient signature** chez des concurrents premium français. Sources prioritaires :

- Sites e-commerce des maisons parisiennes premium :
  - Mori Yoshida, L'Éclair de Génie, Popelini, Gâteaux Thoumieux, Maison Mulot, Liberté Pâtisserie, Land&Monkeys, Boneshaker, Jean-Paul Hévin, Pierre Hermé, Pâtisserie Cyril Lignac, Ladurée, Dalloyau, Carton
- Granola premium : Michel & Augustin, Jordans (référence industrielle à exclure), Belberry, Bonneterre, Marlette, Super Granola, La Trinitaine
- Boutiques spécialisées IGP pistache : Maison Pariès, Secco, boutiques italiennes parisiennes (Eataly)
- Carrot cake : référence Bread Ahead, Liberté, B&M

**Objectif :** identifier une fourchette PPC TTC réaliste pour chaque produit. Pour un cube 85 g haut de gamme en cacao d'origine, attends-toi à 4,50 € – 7,50 € TTC. Pour un cake 500 g premium, 18 € – 28 € TTC. Pour un pot granola 250 g artisanal, 9 € – 14 € TTC. Pour un cookie individuel 55 g premium, 3 € – 5 € TTC. Pour un brownie 90 g, 4 € – 6 € TTC. **Valide ces fourchettes par tes recherches réelles** avant de trancher.

### 2. Déduction des prix canaux B2B

**Règles de cohérence standard pâtisserie artisanale premium France** (tu peux les ajuster si tes recherches montrent autre chose — justifie alors) :

- **TVA alimentaire (produits à emporter)** = 5,5 %. Donc `PPC_HT = PPC_TTC / 1,055`.
- **Prix Épicier direct HT ≈ PPC_HT × 0,50** (coefficient 2 en boutique — laisse à l'épicier une marge brute de 50 %).
- **Prix Grossiste HT ≈ PxEpicier × 0,80 à 0,85** (le grossiste achète moins cher car il stocke et revend à d'autres, laisse une marge distributeur de 15-20 %).
- **Prix Agent HT ≈ PxGrossiste × 1,12** (on majore pour absorber la commission agent ~12 %, net pour la Maison = PxGrossiste).
- **Prix Plateforme B2B (Ankorstore) ≈ PxGrossiste × 1,08 à 1,12**. Ankorstore prélève ~25 % côté acheteur mais le prix affiché doit laisser à la marque un net proche du prix grossiste.

Vérifie ces ratios sur **Ankorstore / Faire** en consultant directement des pages de produits comparables (pâtisseries artisanales françaises premium) : note le PPC affiché et le MOQ, et compare aux boutiques des mêmes marques pour valider le ratio grossiste/boutique.

### 3. Coût de revient (`cost`)

Estimation par la règle classique pâtisserie artisanale premium : **coût matière ≈ 20-28 % du PPC TTC**, coût total (matière + main d'œuvre + emballage + quote-part charges) ≈ **30-40 % du PPC TTC** pour une marge brute atelier viable.

Affine produit par produit en tenant compte du coût **réel des matières signature** (pistache Bronte IGP : ~80 €/kg ; chocolat 72 % Équateur origine : ~15-25 €/kg ; noisette Piémont IGP : ~35 €/kg ; matcha Uji cérémonial : ~150-300 €/kg ; macadamia : ~40 €/kg ; citron Menton IGP : ~15 €/kg ; vanille Madagascar : ~400-600 €/kg mais dose très faible). **Cite tes sources** pour ces prix matière (grossistes bio, Metro, épiceries pro).

Pour un cube 85 g avec 5 g d'ingrédient signature (6 % du poids), le coût matière signature varie de 0,08 € (noisette) à 1,50 € (vanille). Additionne matière base (farine, beurre AOP, œufs, sucre canne bio — ~4-6 €/kg) au prorata du poids produit, puis arrondis pour obtenir un coût total cohérent avec la fourchette 30-40 % du PPC.

### 4. Franco de port

Standards B2B pâtisserie artisanale premium France :
- **Ambiant sec** (granola, cake, cookies, brownie) : franco typique **150 € – 250 € HT**.
- **Frigo / chaîne du froid** (Cub'Cakes frigo) : franco plus élevé car transport frigo coûteux, **250 € – 400 € HT**.

Vérifie chez Ankorstore / Faire les seuils pratiqués par les marques comparables. Propose un franco unique par catégorie si cohérent, ou différencié si la logique logistique le justifie.

## RÈGLES DE SORTIE

### Artefact 1 — JSON enrichi (prêt à importer)

Reproduis la **structure complète** `{ "categories": [...], "produits": [...] }` fournie plus bas, avec les 16 produits et tous leurs champs, mais avec `cost`, `ppc`, `pxGrossiste`, `pxAgent`, `pxEpicier`, `pxPlateforme`, `franco` remplis (nombres, pas `null`).

- Arrondis les prix à 2 décimales (`2.60`, pas `2.6`).
- `ppc` : arrondis à 0,50 € le plus proche (prix boutique lisible).
- `pxGrossiste` / `pxAgent` / `pxEpicier` / `pxPlateforme` : arrondis à 0,05 € ou 0,10 €.
- `cost` : 2 décimales.
- `franco` : nombre entier (250, 300, pas 247).

**Ne mets aucun commentaire dans le JSON.** Le fichier doit être parseur-compatible.

### Artefact 2 — Rapport markdown

Structure attendue :

```markdown
# Rapport de chiffrage catalogue Maison Félicien

## Synthèse
- Méthodologie appliquée (en 5 lignes max)
- Coefficients retenus (PPC HT → Épicier → Grossiste → Agent → Plateforme)
- Franco retenu par catégorie

## Benchmarks PPC par catégorie

### Cub'Cakes 85 g
| Maison | Produit comparable | PPC TTC | URL |
| --- | --- | --- | --- |
| Mori Yoshida | … | … € | https://… |
| … | | | |

[→ fourchette retenue MF : X,XX – X,XX € TTC, médian Y,YY €]

### Cakes 500 g
…

### Cookies & Brownie
…

### Granola 250 g
…

## Fiche par produit

### CC-001 Cub'Cake Chocolat Noir 72%
- PPC TTC retenu : 6,50 € — *justification : milieu de fourchette benchmark, cohérent avec chocolat origine Équateur*
- PPC HT : 6,16 € (/1,055)
- Épicier direct HT : 3,08 € (×0,50)
- Grossiste HT : 2,60 € (×0,85)
- Agent HT : 2,90 € (×1,12)
- Plateforme HT : 2,80 € (×1,08)
- Coût de revient HT : 1,20 € (matière : 0,85 €, main d'œuvre 0,25 €, emballage 0,10 €)
- Sources matière : chocolat 72 % Équateur à 18 €/kg (Valrhona pro, réf. Alpaco) — https://…

### CC-002 …
…

## Franco de port
- CC (frigo) : 300 € HT — justification (coûts chaîne du froid)
- CK / CB / GR (ambiant) : 200 € HT — justification

## Points d'attention signalés
- (Si une valeur du JSON initial semble incohérente, la mentionner ici — sans la modifier.)

## Sources consultées
- URL 1
- URL 2
- …
```

### Règles de qualité

- **Chaque prix doit être sourcé** par au moins un benchmark réel URL-référencé.
- **Aucun prix hors fourchette** du marché premium (si tu proposes 15 € pour un cube 85 g, ça ne colle pas ; si tu proposes 2 € pour un cake 500 g premium, non plus).
- **Cohérence multi-canal vérifiée** : `pxGrossiste < pxPlateforme < pxAgent < pxEpicier < ppc_HT < ppc`.
- **Marge atelier minimale respectée** : `cost < pxGrossiste × 0,60` (la Maison ne doit jamais vendre à perte via grossiste).
- **Si une info reste incertaine**, propose la valeur médiane et signale l'incertitude dans le rapport.

## LIVRABLES

Deux fichiers distincts dans ta réponse finale :
1. `catalogue-mf-seed-enriched.json` — le JSON complet enrichi.
2. `rapport-chiffrage.md` — le rapport markdown.

Pas de markdown autour du bloc JSON. Le JSON doit être importable directement dans le builder via son bouton "Import JSON" sans retouche.

---

## JSON ACTUEL À ENRICHIR (NE PAS MODIFIER LES CHAMPS NON FINANCIERS)

```json
[COLLE ICI le contenu de `.specs/catalogue-mf-seed.json` — 16 produits, ~670 lignes]
```
