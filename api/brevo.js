// API Brevo · sync contact + récupération statut liste
// Gère /api/brevo?action=sync|list-membership
//
// Env requis côté Vercel :
//   BREVO_API_KEY           (clé API Brevo, format xkeysib-...)
//   BREVO_LIST_GROSSISTES   (id numérique liste Brevo)
//   BREVO_LIST_AGENTS       (id numérique liste Brevo)
//   BREVO_LIST_PLATEFORMES  (id numérique liste Brevo)
//
// Auth : Bearer token Supabase (vérifie rôle admin)

const SUPABASE_URL = 'https://ckvwkwufdlydobjfwvwy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HICvkAoFNpeWenSsXT-FFQ_4O0IyS2l';
const BREVO_API = 'https://api.brevo.com/v3';

const SEQ_TO_LIST = {
  SEQ_A_GROSSISTE: 'BREVO_LIST_GROSSISTES',
  SEQ_B_AGENT: 'BREVO_LIST_AGENTS',
  SEQ_C_PLATEFORME: 'BREVO_LIST_PLATEFORMES'
};

async function verifyAdmin(token) {
  if (!token) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
    });
    if (!r.ok) return false;
    const user = await r.json();
    return user?.app_metadata?.role === 'admin';
  } catch { return false; }
}

function guardBrevoKey() {
  const k = process.env.BREVO_API_KEY;
  if (!k) return 'BREVO_API_KEY manquante côté Vercel';
  for (let i = 0; i < k.length; i++) {
    if (k.charCodeAt(i) > 127) return `BREVO_API_KEY contient un caractère non-ASCII (index ${i})`;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const isAdmin = await verifyAdmin(token);
  if (!isAdmin) return res.status(401).json({ error: 'Session admin requise' });

  const keyIssue = guardBrevoKey();
  if (keyIssue) return res.status(500).json({ error: keyIssue });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== 'object') body = {};
  const { action, distributeur, sequence_id } = body;

  if (action === 'sync') {
    // distributeur requis : { email, prenom, nom, societe, type_distrib, tier }
    if (!distributeur || !distributeur.email) {
      return res.status(400).json({ error: 'Email du distributeur requis' });
    }
    if (!sequence_id || !SEQ_TO_LIST[sequence_id]) {
      return res.status(400).json({ error: 'sequence_id invalide' });
    }
    const listIdEnv = SEQ_TO_LIST[sequence_id];
    const listId = Number(process.env[listIdEnv]);
    if (!listId) return res.status(500).json({ error: `Liste Brevo non configurée (${listIdEnv})` });

    try {
      const r = await fetch(`${BREVO_API}/contacts`, {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email: distributeur.email,
          attributes: {
            PRENOM: distributeur.prenom || '',
            NOM: distributeur.nom || '',
            SOCIETE: distributeur.societe || '',
            TYPE: distributeur.type_distrib || '',
            TIER: distributeur.tier || 'C'
          },
          listIds: [listId],
          updateEnabled: true
        })
      });
      const data = await r.json();
      if (!r.ok) {
        // Brevo renvoie souvent 400 si déjà existant — OK sur update
        if (r.status === 400 && data.code === 'duplicate_parameter') {
          // Contact existe, on le met à jour + on l'ajoute à la liste
          const upd = await fetch(`${BREVO_API}/contacts/${encodeURIComponent(distributeur.email)}`, {
            method: 'PUT',
            headers: {
              'api-key': process.env.BREVO_API_KEY,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              attributes: {
                PRENOM: distributeur.prenom || '',
                NOM: distributeur.nom || '',
                SOCIETE: distributeur.societe || '',
                TYPE: distributeur.type_distrib || '',
                TIER: distributeur.tier || 'C'
              },
              listIds: [listId]
            })
          });
          if (!upd.ok) {
            const updData = await upd.json();
            return res.status(502).json({ error: 'Erreur update Brevo', detail: updData.message || 'inconnu' });
          }
          return res.status(200).json({ ok: true, action: 'updated', list_id: listId });
        }
        return res.status(502).json({ error: data.message || 'Erreur API Brevo', code: data.code });
      }
      return res.status(200).json({ ok: true, action: 'created', brevo_contact_id: data.id, list_id: listId });
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur', detail: err.message });
    }
  }

  return res.status(400).json({ error: 'Action inconnue', supported: ['sync'] });
}
