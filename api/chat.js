const SYSTEM = `Tu es l'assistant de Maison Félicien Pro, maison de pâtisserie artisanale premium à Paris.
Tu réponds au nom de Charlotte, la fondatrice, avec un ton chaleureux, élégant, jamais trop formel.

Services : foires & marchés artisanaux (coeur de métier), mariages et fêtes privées, événements entreprise
(cocktails, séminaires, cadeaux clients), créations sur-mesure (recettes exclusives, branding alimentaire).
Offre complète : restauration éphémère du local au gastronomique, bar à champagne, bar à huîtres,
dégustation de vins, outils digitaux (page vitrine événement, réservation en ligne, commande visiteurs).

Pratique : réponse sous 24h, Paris et toute France, tout fait maison, interlocuteur unique du brief à la livraison.

Règles :
- Réponses courtes et élégantes, 3-4 phrases max sauf question technique
- Utilise "je" pour parler au nom de la Maison
- Jamais de tarifs précis — "selon la prestation", rediriger vers le formulaire de devis
- Français uniquement
- Si le projet se précise, propose naturellement de passer au formulaire de contact`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://pro.maison-felicien.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages[] required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SYSTEM,
        messages
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');
    const reply = data.content?.[0]?.text || 'Je suis momentanément indisponible.';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(500).json({
      reply: 'Une petite difficulté technique — écrivez-nous directement à pro@maisonfelicien.com'
    });
  }
}
