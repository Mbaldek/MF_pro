export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://pro.maison-felicien.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nom, societe, email, telephone, site_web, nom_projet,
          type_evenement, date_evenement, nb_personnes, message, source } = req.body;

  if (!nom || !email || !telephone) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        nom, societe, email, telephone, site_web, nom_projet,
        type_evenement, date_evenement, nb_personnes, message,
        source: source || 'pro-site',
        statut: 'nouveau',
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) throw new Error(await response.text());
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Leads API error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
