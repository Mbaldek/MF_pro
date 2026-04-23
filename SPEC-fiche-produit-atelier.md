# SPEC — Fiche produit "Atelier" (modal centré + live preview)

**Statut** : prêt à implémenter
**Livraison** : en une seule passe (v1 complète)
**Fichier cible** : `public/outils/catalogue-builder.html` (single-file app)
**Méthode** : `FEATURE-BLUEPRINT.md` — 7 couches

---

## LAYER 1 · Business framing

- **JTBD** — Quand je saisis ou enrichis une fiche produit, je veux voir *la fiche finale prendre forme en temps réel* pendant que je remplis, pour la valider sans export intermédiaire.
- **User value** — Le formulaire devient un atelier : à gauche les champs, à droite la fiche grossiste qui se compose à chaque frappe.
- **Business value** — Temps de complétion d'une fiche ↓. Catalogue grossiste prêt plus vite. Moins d'allers-retours export → correction.
- **KPI** — Temps médian entre "créer produit" et "complétion ≥ 90 %". Cible : -40 %.
- **Failure signal** — Si le temps par champ ↑ ou si le taux de fiches à 100 % ne monte pas, on rollback.
- **Build-or-buy** — Custom. Pas de tiers pertinent.

---

## LAYER 2 · Direction retenue

**Variant 1 — "Atelier"** (modal centré split 58/42, live preview à droite).
Écarté : drawer droit actuel (gaspille l'écran), canvas plein écran (trop lourd), modal simple sans preview (on perd la feature qui justifie le chantier).

---

## LAYER 3 · UX — flows & states

**Entry points** (inchangés)
- Clic sur `.product-card`
- Bouton `+ Nouveau produit`
- À ajouter : `Esc` pour fermer, `Cmd+S` pour sauver-fermer, `Tab` piégé dans le modal.

**Happy path**
1. Ouverture : fade + scale .96 → 1, backdrop blur, autofocus sur `Nom` (nouveau) ou dernier champ modifié (édition).
2. Saisie : aperçu droit mis à jour en live, debounce 200 ms.
3. Onglets 1–5 naviguent côté form ; l'aperçu droit reste sur la *fiche grossiste complète*.
4. Completion ring en header passe 0 → 100 %.
5. À 100 % : badge "Prête à exporter" + bouton "Exporter fiche grossiste" actif en footer.
6. Fermeture : commit localStorage + sync Shopify (existant).

**States**
- *Empty (nouveau)* : aperçu droit = wireframe silhouette + hint "Renseignez nom + image pour voir la fiche prendre forme".
- *Loading IA* : bouton `✦ Enrichir` en shimmer, overlay local sur le champ concerné uniquement.
- *Error validation* : champ rouge + focus auto sur le premier invalide, toast existant conservé.
- *Success 100 %* : badge vert + CTA export direct.
- *Offline* : bannière jaune, sauvegarde localStorage jusqu'à retour réseau.
- *Conflit (2 onglets)* : bannière "Modification plus récente ailleurs — recharger ?".

**Responsive** : split tombe en vertical sous `1024px` (preview passe sous le formulaire, hauteur 40vh, sticky top).

---

## LAYER 4 · UI — tokens & structure

Palette et typos déjà en place dans le fichier :
```css
--rose:       #8B3A43   /* primary */
--vieux-rose: #BF646D
--poudre:     #E5B7B3   /* borders */
--vert:       #968A42   /* success */
--blanc:      #F0F0E6   /* surface */
--marron:     #392D31   /* text / header */
--serif:  'Cormorant Garamond', Georgia, serif;  /* italic pour titres */
--sans:   'Questrial', sans-serif;
```

**Tokens additionnels**
```css
--modal-w:       1280px;
--modal-h:       88vh;
--modal-radius:  6px;
--modal-shadow:  0 40px 80px -20px rgba(57,45,49,.35), 0 0 0 1px rgba(229,183,179,.4);
--ease-out:      cubic-bezier(.2,.8,.2,1);
--motion-enter:  240ms;
--split-left:    58%;
--split-right:   42%;
```

**Structure DOM cible**
```
.modal-backdrop.centered
  .modal.atelier
    header.modal-head
      .title         (serif italic, code · nom)
      .completion-ring (SVG 36×36, conic arc)
      .status-pill
      .actions       [Dupliquer] [Archiver] [⋯] [×]
    .atelier-body    (grid 58/42)
      section.form
        .tabs (5)  .tab-indicator
        .panel.active (scrollable interne)
      section.preview
        .preview-toolbar   [Grossiste ⇄ Catalogue]
        .preview-stage     (ratio A5, scale fit)
          .preview-fiche   (rendu live)
    footer.modal-foot
      .draft-info   (auto-saved · 12s)
      .actions      [Ghost:Fermer] [Primary:Exporter → actif ≥ 90%]
```

**Motion**
- Ouverture : `${--motion-enter} var(--ease-out)` scale+opacity.
- Tabs : `.tab-indicator` (existant) glisse sous l'onglet actif.
- Completion ring : arc animé 400 ms à chaque changement.
- Champ validé : cochet `--vert` pulse 1 fois.
- 100 % atteint : micro-confetti subtil côté preview (opt-in setting, désactivable).

**Accessibilité**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`.
- Live region `aria-live="polite"` annonce la complétion ("Fiche complétée à 78 %").
- Focus trap, `Esc` ferme avec confirmation si dirty.
- Contraste rose/blanc déjà AA.

---

## LAYER 5 · API contract

Aucune nouvelle route. Ce qu'on utilise, existant :
- `POST /api/enrich` — champs IA (inchangé).
- Persistence : `localStorage` + Shopify Metafields (inchangé).

Ajouts **purement client** :
```js
renderPreview(product, surface)   // 'grossiste' | 'catalogue' → HTML
debouncePreview(product, 200)     // trigger sur input/change
computeCompletion(product)        // déjà là ; on le branche au ring SVG
```

---

## LAYER 6 · Backend & data model

Inchangé. Schéma produit identique (les 5 panels couvrent déjà tous les champs). Pas de migration.

**Observabilité** : on instrumente côté client (cf. section Analytics).

---

## LAYER 7 · Frontend implementation

**Fichier unique** : `public/outils/catalogue-builder.html`.

**CSS à refondre**
- Remplacer `.modal-backdrop` et `.modal` (lignes ~463–483) :
  - `.modal-backdrop` → `align-items: center; justify-content: center;` + backdrop blur 8px.
  - `.modal` → `max-width: var(--modal-w); max-height: var(--modal-h); border-radius: var(--modal-radius); box-shadow: var(--modal-shadow);`.
- Ajouter `.atelier-body { display: grid; grid-template-columns: 58fr 42fr; }` + `@media (max-width:1024px) { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }`.
- Ajouter `.preview-*` (stage, fiche, toolbar).
- Ajouter `.completion-ring` (SVG conic arc).
- Garder `.modal-foot` existant, enrichir avec `.draft-info` + état disabled du bouton Exporter tant que completion < 90 %.

**JS à ajouter / modifier**
- `renderPreview(product, surface)` — fonction pure, retourne HTML injecté dans `.preview-fiche`.
- `attachPreviewListeners()` — délégation sur `.modal-body`, événements `input`/`change`, debounce 200 ms.
- `updateCompletionRing(pct)` — met à jour `stroke-dasharray` du SVG + badge 100 %.
- `openModal(idx)` — signature inchangée, passe `.modal.open` sur le nouveau shell.
- `trapFocus(modalEl)` — focus trap + Esc-with-confirm si dirty.
- `togglePreviewSurface()` — bascule grossiste ⇄ catalogue.
- Keyboard : `Cmd/Ctrl+S` = save & close ; `Esc` = close ; `1..5` (avec `Alt`) = aller onglet N.

**Ne PAS toucher**
- Logique de persistence / sync Shopify.
- Schéma de données produit.
- Autres modals (export, paramètres catégorie, pricing) — style à aligner dans une passe ultérieure.
- Product cards de la liste.

---

## Admin counterpart

Le modal "Paramètres catégorie" existant (≈ lignes 1965–2120) partage le même shell `.modal-backdrop .modal`. Il héritera automatiquement du nouveau style centré (c'est voulu : cohérence). Pas d'action dédiée.

**Kill switch** : setting `display.previewLive` (localStorage, `true` par défaut). À `false`, la colonne droite est masquée et le form passe pleine largeur. Pour les power-users.

---

## Analytics

Events à pousser (stub `window.track()` — prêt à câbler) :
- `product_modal_opened` `{ mode, code, entry }`
- `product_modal_tab_switched` `{ from, to }`
- `product_preview_toggled` `{ surface }`
- `product_ai_enriched` `{ field }`
- `product_modal_closed` `{ dirty, completion, duration_ms }`
- `product_saved_complete` `{ code, completion }`

**Funnel** : opened → first_input → tab_2_reached → completion_50 → completion_100 → closed_saved.
**Retention signal** : % de fiches rouvertes après 100 %. Haut = mauvais (on oublie des champs).

---

## Value creation audit

1. **Retirer ?** Non — cœur de saisie.
2. **Qui / quand ?** PM catalogue, quotidien en phase de build.
3. **Coût cognitif ?** ↓ (live preview remplace l'imagination du rendu).
4. **Monétisation ?** Indirecte : catalogue plus complet → meilleures fiches grossistes → conversion B2B.
5. **v0.1 minimale ?** Non applicable ici (livraison en 1 passe par décision produit).

---

## Découpage CC (un prompt par tâche)

### CC-1 · CSS shell centré + tokens

**Contexte** — Fichier `public/outils/catalogue-builder.html`. Drawer droit actuel à transformer en modal centré.
**À faire** — Remplacer les règles `.modal-backdrop` et `.modal` (lignes ~463–483). Ajouter les tokens `--modal-*`, `--ease-out`, `--split-*` dans `:root`. Ajouter `.atelier-body` (grid 58/42 + breakpoint mobile).
**Ne pas** — Toucher aux autres modals, aux `.panel`, aux `.tabs`.
**Acceptance** — Ouvrir une fiche ouvre un modal centré, backdrop flouté, ouverture en scale+fade 240 ms ; shell vide s'affiche correctement.

### CC-2 · Colonne preview (HTML + CSS)

**Contexte** — Shell centré livré (CC-1).
**À faire** — Ajouter `section.preview` (toolbar + stage + `.preview-fiche`) à droite de `section.form` dans le DOM. CSS : ratio A5, scale-down, filet poudre séparateur. Toolbar avec toggle Grossiste ⇄ Catalogue (pas encore fonctionnel).
**Acceptance** — Colonne visible, occupe 42 % largeur ≥ 1024px ; passe sous le form en mobile.

### CC-3 · `renderPreview()` + binding live

**Contexte** — Shell + colonne preview livrés (CC-1, CC-2).
**À faire** — Fonction pure `renderPreview(product, surface)` retournant le HTML de la fiche grossiste (image, nom serif, prix HT/TTC, conditionnement, DLC, description courte, tags). Listener `input`/`change` délégué sur `.modal-body`, debounce 200 ms, injection dans `.preview-fiche`. Toggle toolbar branché.
**Ne pas** — Modifier la structure du formulaire, changer les IDs des champs.
**Acceptance** — Toute modif d'un champ se reflète dans la colonne droite sous 300 ms. Toggle Grossiste ⇄ Catalogue fonctionne.

### CC-4 · Completion ring SVG + badge 100 %

**Contexte** — Fonction `computeCompletion()` existe déjà, calcule un %.
**À faire** — Remplacer l'actuel `.completion` (track/fill linéaire) dans le header par un ring SVG 36×36 (arc conic). Animer `stroke-dasharray` sur 400 ms. À 100 % : badge vert "Prête à exporter" + activation du bouton "Exporter" en footer (disabled < 90 %).
**Acceptance** — Ring visuellement aligné avec le header ; animation fluide ; badge apparaît à 100 % exactement.

### CC-5 · Focus trap + raccourcis clavier

**Contexte** — Modal fonctionnel.
**À faire** — Trap focus (Tab/Shift+Tab bouclent dans le modal). `Esc` ferme avec `confirm()` si dirty. `Cmd/Ctrl+S` = save & close. `role="dialog" aria-modal aria-labelledby`. Live region `aria-live="polite"` annonçant la complétion.
**Acceptance** — Navigation clavier seule possible sans fuir le modal ; lecteur d'écran annonce les changements de complétion.

### CC-6 · Footer enrichi + auto-save indicator

**Contexte** — Persistence existante dans le fichier.
**À faire** — Footer : à gauche `.draft-info` "auto-saved · Ns". À droite : bouton ghost "Fermer", bouton primary "Exporter fiche grossiste" (disabled si completion < 90 %). L'exporter réutilise le flow existant (`modal-export`).
**Acceptance** — Indicateur se met à jour à chaque save ; le bouton Exporter déclenche le modal export existant.

### CC-7 · Kill switch preview + setting

**Contexte** — Setting localStorage `display.previewLive` (default `true`).
**À faire** — Si `false`, `.atelier-body` devient `grid-template-columns: 1fr`, `.preview` en `display: none`. Toggle accessible dans le menu `⋯` du header modal.
**Acceptance** — Désactiver cache la preview et élargit le form ; persistant après reload.

### CC-8 · Analytics stub

**Contexte** — Aucun tracker branché aujourd'hui.
**À faire** — Créer `window.track(event, props)` stub (console.log en dev). Appeler aux 6 points listés section Analytics.
**Acceptance** — `console.log` visible dans la devtools pour chaque event listé.

---

## Risques & garde-fous

- **Régression sur les autres modals** : ils partagent `.modal-backdrop .modal`. Vérifier visuellement les modals export, paramètres catégorie, pricing — acceptables si centrés (design cohérent).
- **Perf preview** : HTML pur, pas d'iframe ; débounce 200 ms suffisant. Surveiller jank sur machines basses.
- **LocalStorage quota** : inchangé.
- **Rollback** : le shell est un seul bloc CSS ; revert du commit = drawer droit retrouvé.
