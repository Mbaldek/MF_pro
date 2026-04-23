const SUPABASE_URL = 'https://ckvwkwufdlydobjfwvwy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HICvkAoFNpeWenSsXT-FFQ_4O0IyS2l';

const SYSTEM = `Tu écris pour Maison Félicien, maison de pâtisserie artisanale premium basée à Paris.

Voix:
- Élégante, sobre, précise. Jamais grandiloquente.
- Sensibilité artisanale : matières nobles, geste, saison.
- Français uniquement. Pas d'anglicismes marketing.
- Pas d'emoji. Pas de superlatif creux ("exceptionnel", "incomparable", "unique en son genre").
- Concret plutôt que conceptuel : nomme la matière, le geste, l'origine, la sensation.

Règles strictes:
- N'invente jamais une origine géographique précise, un nom de producteur, une AOP/IGP/label, ni une récompense qui ne sont pas fournis dans le contexte.
- Si une information manque pour être précis, reste évocateur plutôt que d'inventer.
- N'ajoute aucune introduction, commentaire méta, ni guillemets autour du texte.
- Réponds uniquement par le texte demandé, prêt à être collé dans la fiche.`;

const FIELD_INSTRUCTIONS = {
  'desc-courte':
    "Rédige une description courte (25 à 35 mots, une à deux phrases). Capture le produit par une image sensorielle concrète et un détail technique distinctif. Prose fluide, pas de bullet.",
  'desc-longue':
    "Rédige une description longue (80 à 120 mots). Storytelling bref : geste artisanal, matière, pointe d'émotion ou de contexte saisonnier. Une seule prose fluide, pas de titres ni de bullets.",
  'rationnel':
    "Rédige un argumentaire distributeur en 3 à 5 bullet points (format '• …'). Angles : différenciation marché, profil client cible, logique de rotation, positionnement prix/valeur. Ton factuel B2B, pas poétique. Pas de chiffres inventés.",
  'recette':
    "Rédige un court storytelling recette (60 à 90 mots). Choisis UN seul angle, bien tenu : rencontre avec un producteur générique (sans nom inventé), détail technique signature, ou inspiration saisonnière. Prose fluide."
};

function buildContext(p) {
  const lines = [];
  if (p.nom) lines.push(`Nom: ${p.nom}`);
  if (p.sousTitre) lines.push(`Sous-titre: ${p.sousTitre}`);
  if (p.categorie) lines.push(`Catégorie: ${p.categorie}`);
  if (p.saison) lines.push(`Saison: ${p.saison}`);
  if (p.gout) lines.push(`Goût / profil: ${p.gout}`);
  if (p.ingredients) lines.push(`Ingrédients: ${p.ingredients}`);
  if (p.allergenes) lines.push(`Allergènes: ${p.allergenes}`);
  if (p.origine) lines.push(`Origine déclarée: ${p.origine}`);
  if (p.tags) lines.push(`Tags: ${p.tags}`);
  if (p.packLibelle) lines.push(`Conditionnement: ${p.packLibelle}`);
  if (p.descCourte && p.descCourte.trim()) lines.push(`Description courte existante: ${p.descCourte}`);
  if (p.descLongue && p.descLongue.trim()) lines.push(`Description longue existante: ${p.descLongue}`);
  return lines.join('\n');
}

async function verifyAdmin(token) {
  if (!token) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });
    if (!r.ok) return false;
    const user = await r.json();
    return user?.app_metadata?.role === 'admin';
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée sur Vercel' });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const isAdmin = await verifyAdmin(token);
  if (!isAdmin) return res.status(401).json({ error: 'Session admin requise' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};
  const { field, produit } = body;
  if (!field || !FIELD_INSTRUCTIONS[field]) {
    return res.status(400).json({ error: 'Champ IA invalide' });
  }
  if (!produit || !produit.nom || !produit.nom.trim()) {
    return res.status(400).json({ error: 'Le nom du produit est requis' });
  }

  const context = buildContext(produit);
  const userPrompt = `Contexte produit:\n${context}\n\nTâche:\n${FIELD_INSTRUCTIONS[field]}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: [
          { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }
        ],
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return res.status(502).json({ error: data.error?.message || 'Erreur API Claude' });
    }

    const text = (data.content?.[0]?.text || '').trim();
    if (!text) return res.status(502).json({ error: 'Réponse IA vide' });
    return res.status(200).json({ text });

  } catch (err) {
    console.error('Enrich handler error:', err?.message, err?.stack);
    return res.status(500).json({
      error: 'Erreur serveur',
      detail: err?.message || String(err),
      where: err?.stack?.split('\n')?.[1]?.trim()
    });
  }
}
