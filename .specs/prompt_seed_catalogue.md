# Prompt — Génération du JSON seed pour le catalogue builder Maison Félicien

À coller dans Claude (claude.ai ou autre agent) avec, à la fin, la liste brute des produits.
Le JSON produit est ensuite importé via le bouton **"Import JSON"** du catalogue builder
sur `https://pro.maison-felicien.com/outils/catalogue-builder`.

---

## CONTEXTE

Tu es en train de préparer le **JSON seed** d'un outil interne de saisie catalogue pour
**Maison Félicien**, une maison de pâtisserie artisanale premium à Paris (univers Art Nouveau,
botanique, storytelling origines). L'outil attend un fichier JSON au format précis ci-dessous,
que l'utilisateur chargera via son bouton "Import JSON".

Ton travail : à partir de la liste brute fournie en bas de ce prompt, produire UN SEUL bloc
JSON valide, prêt à sauvegarder sous `catalogue-mf.json` et à importer tel quel. **Pas de
commentaire, pas de markdown autour du JSON final — juste le JSON.**

## SCHÉMA À RESPECTER À LA LETTRE

Structure racine :

```json
{
  "categories": [ ... ],
  "produits": [ ... ]
}
```

### Categories — FIGÉES, à reprendre telles quelles

```json
[
  { "code": "CC", "nom": "Cub'Cakes",        "subtitle": "Format cube · fournée hebdomadaire numérotée", "ordre": 1 },
  { "code": "CK", "nom": "Cakes",            "subtitle": "Grands formats, tradition pâtissière",        "ordre": 2 },
  { "code": "CB", "nom": "Cookies & Brownie","subtitle": "Gourmandises individuelles",                  "ordre": 3 },
  { "code": "GR", "nom": "Granola",          "subtitle": "Artisanal, petites productions",              "ordre": 4 },
  { "code": "AV", "nom": "Marketing & PLV",  "subtitle": "Aide à la vente pour distributeurs",          "ordre": 5 }
]
```

**Ne pas modifier ces 5 codes ni leur ordre.** Chaque produit doit avoir un `categorie`
qui matche l'un de ces codes.

### Produit — schéma exhaustif (tous les champs doivent exister, même si vides)

```json
{
  "code": "CC-001",                    // string, format "[CAT]-[3 chiffres]", unique
  "categorie": "CC",                   // string, un des 5 codes ci-dessus
  "statut": "actif",                   // "actif" | "pause" | "archive"

  "nom": "Cub'Cake Chocolat Noir 72%", // string, nom commercial
  "sousTitre": "Arriba Nacional · Équateur", // string, accroche origine ou format, "" si rien
  "saison": "permanente",              // "permanente" | "hiver" | "printemps" | "été" | "automne" | "fêtes"

  "descCourte": "…",                   // ~30 mots. Une phrase d'accroche situant goût + origine. Sobre, premium, pas d'emoji, pas de superlatif vide.
  "descLongue": "",                    // laisser vide ("") au seed — sera enrichi plus tard
  "rationnel": "• argument 1\n• argument 2\n• argument 3", // 3 bullets pour distributeur B2B. Concret, chiffré si possible. \n entre bullets.
  "ingredients": "Farine T65, beurre AOP, …, sel de Guérande.", // liste courte, virgules, phrase terminée par un point
  "allergenes": "Gluten · œufs · lait",// séparé par " · ", liste des allergènes majeurs
  "origine": "Chocolat Arriba Nacional, région d'Esmeraldas, Équateur", // origine de l'ingrédient signature
  "recette": "",                       // laisser vide au seed

  "tags": "chocolat, équateur, snacking, artisanal", // mots-clés séparés par virgules
  "gout": "Intense, cacaoté, notes de fruits rouges", // profil de goût en ~5-8 mots

  "packType": "UNITE",                 // "UNITE" | "BOITE" | "POT" | "KIT" | "COFFRET"
  "packLibelle": "À l'unité",          // libellé court lisible par humain
  "packUnites": 1,                     // number, nombre d'unités internes (ex: 6 pour boîte de 6)
  "packMOQ": 6,                        // number, Minimum Order Quantity (en packs)
  "packDLC": 5,                        // number (jours) ou null si non pertinent (PLV)
  "packPoids": 85,                     // number, grammes
  "packL": 5,                          // number, longueur cm (décimales OK : 5.5)
  "packW": 5,                          // number, largeur cm
  "packH": 5,                          // number, hauteur cm
  "packEAN": "",                       // string, GTIN 13 ou "" si pas encore
  "packSKU": "CC-001",                 // string, reprend généralement le code produit

  "cost": 1.20,                        // number, coût de revient HT / pack en €, 2 décimales
  "ppc": 6.50,                         // number, Prix Public Conseillé TTC / pack (pour produits food) ou 0 (PLV)
  "pxGrossiste": 2.60,                 // number, prix HT canal Grossiste / pack, 0 si non vendu via ce canal
  "pxAgent": 2.90,                     // number, prix HT canal Agent commercial
  "pxEpicier": 3.20,                   // number, prix HT canal Épicier direct
  "pxPlateforme": 2.80,                // number, prix HT canal Plateforme B2B (Ankorstore/Faire)

  "expedition": "frigo",               // "frigo" | "ambiant" | "sec" | "surgelé"
  "franco": 250,                       // number, franco de port HT en €, 0 si pas de franco
  "delai": 3,                          // number, délai de réassort en jours
  "paiement": "30fdm",                 // "comptant" | "30fdm" (30 jours fin de mois) | "offert" (produits AV offerts)
  "reprise": "lancement",              // "aucune" | "lancement" (invendus repris en phase lancement) | "permanente"
  "notesLogistique": "",               // string, notes libres (ex: "Livraison lundi matin uniquement")

  "photo": null                        // null au seed (pas de photo dans le JSON initial, upload se fait dans l'UI)
}
```

### Règles de codification

- **Code produit** : `{CODE_CATEGORIE}-{NUMERO_3_CHIFFRES}` → `CC-001`, `CC-002`, `CK-001`, …
- Numérotation séquentielle **par catégorie**, commençant à `001`.
- `packSKU` reprend par défaut le `code` produit.
- `packEAN` reste `""` tant que l'EAN réel n'est pas connu.

### Règles rédactionnelles (ton Maison Félicien)

- **Jamais d'emoji.**
- **Ton sobre, précis, premium.** Évite les superlatifs creux ("incroyable", "magique", "le meilleur", "exceptionnel" sans justification).
- **Origine traçable** dès que possible (pays, région, IGP, producteur).
- `descCourte` ≈ 30 mots, une phrase d'accroche qui situe profil + origine.
- `rationnel` : 3 bullets **orientés distributeur B2B** sous la forme `"• arg1\n• arg2\n• arg3"` — angles typiques : différenciation marché, rotation/marge, comportement client final. Chiffre si possible (% de marge, j/MOQ, conversion…).
- `allergenes` : séparateur ` · ` (espace-milieu-espace), majeurs uniquement (Gluten, Œufs, Lait, Fruits à coque, Sésame, Soja, etc.).
- Ponctuation française (apostrophes typographiques ' bienvenues mais pas obligatoires, l'apostrophe droite ' est acceptée dans le JSON pour simplifier — mais **jamais d'apostrophe courbe `'` ou `'` si tu n'es pas sûr de l'échappement**, utilise `'` tout simplement).

### Règles commerciales par catégorie

| Cat | expedition | paiement | reprise | ppc | notes |
|-----|------------|----------|---------|-----|-------|
| CC  | frigo      | 30fdm    | lancement | rempli | snacking premium |
| CK  | ambiant    | 30fdm    | aucune    | rempli | grand format partage |
| CB  | ambiant    | 30fdm    | aucune    | rempli | snacking impulsif |
| GR  | ambiant    | 30fdm    | aucune    | rempli | DLC longue |
| AV  | ambiant    | offert OU 30fdm | aucune | **0** (PLV non vendue au public) | PLV : `pxGrossiste`/`pxAgent`/`pxEpicier`/`pxPlateforme` souvent à 0 si offert |

Pour les PLV offertes (type présentoir offert aux premiers comptes) : `paiement: "offert"`,
`pxGrossiste`=`pxAgent`=`pxEpicier`=`pxPlateforme`=`0`, et préciser la condition dans
`notesLogistique` (ex: `"Offert aux 15 premiers comptes signés. Au-delà : 80€ HT."`).

## EXEMPLE COMPLET (à imiter pour le format)

```json
{
  "code": "CC-001",
  "categorie": "CC",
  "statut": "actif",
  "nom": "Cub'Cake Chocolat Noir 72%",
  "sousTitre": "Arriba Nacional · Équateur",
  "saison": "permanente",
  "descCourte": "Cube de cake intense au chocolat noir d'origine, fondant et cacaoté, signé d'une fève Arriba d'Équateur.",
  "descLongue": "",
  "rationnel": "• Rotation prouvée 3,8j/MOQ 6\n• Chocolat origine tracée = différenciation immédiate\n• Format snacking premium, marge 40%",
  "ingredients": "Farine de blé T65, beurre AOP, sucre de canne bio, chocolat noir 72% Équateur, œufs plein air, sel de Guérande.",
  "allergenes": "Gluten · œufs · lait",
  "origine": "Chocolat Arriba Nacional, région d'Esmeraldas, Équateur",
  "recette": "",
  "tags": "chocolat, équateur, noir, snacking, artisanal",
  "gout": "Intense, cacaoté, notes de fruits rouges",
  "packType": "UNITE",
  "packLibelle": "À l'unité",
  "packUnites": 1,
  "packMOQ": 6,
  "packDLC": 5,
  "packPoids": 85,
  "packL": 5,
  "packW": 5,
  "packH": 5,
  "packEAN": "",
  "packSKU": "CC-001",
  "cost": 1.20,
  "ppc": 6.50,
  "pxGrossiste": 2.60,
  "pxAgent": 2.90,
  "pxEpicier": 3.20,
  "pxPlateforme": 2.80,
  "expedition": "frigo",
  "franco": 250,
  "delai": 3,
  "paiement": "30fdm",
  "reprise": "lancement",
  "notesLogistique": "Livraison lundi matin uniquement.",
  "photo": null
}
```

## TA MISSION

À partir de la liste brute ci-dessous :

1. Identifie la catégorie (CC/CK/CB/GR/AV) de chaque produit.
2. Génère un `code` séquentiel par catégorie (`CC-001`, `CC-002`, …).
3. Remplis chaque champ selon le schéma. Si une info manque dans la liste brute :
   - **Champs texte marketing** (descCourte, rationnel, ingredients, allergenes, origine, tags, gout) → rédige-les toi-même, fidèlement au ton Maison Félicien et à ce que suggère le nom du produit.
   - **Champs numériques** (prix, poids, MOQ, DLC…) → si absent, **mets `null`** (ne devine PAS un prix).
   - **descLongue**, **recette**, **photo** → toujours `""` ou `null` au seed, on les enrichira dans l'UI.
4. Applique les règles commerciales par catégorie (tableau ci-dessus).
5. Sors **un seul bloc JSON** au format `{ "categories": [...], "produits": [...] }`, rien d'autre.

## LISTE BRUTE DES PRODUITS

<!-- REMPLACE CE BLOC par ta liste. Un produit par ligne ou paragraphe, en vrac —
     Claude va structurer. Exemple de format libre qui marche :

     Cub'Cake Chocolat Noir 72%, chocolat Arriba Équateur, 85g, MOQ 6, prix grossiste 2.60€
     Cub'Cake Pistache, pistache Bronte Sicile, 85g, MOQ 6
     Cake Marbré chocolat-vanille, 500g, format familial, MOQ 3, prix grossiste 7.50
     Brownie pécans individuel 90g
     Granola chocolat-noisette 250g, noisettes Piémont
     Présentoir bois 5 formules (PLV, offert aux 15 premiers comptes)
-->

[COLLE ICI TA LISTE DE PRODUITS]
