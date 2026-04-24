// Webhook Brevo · reçoit les events email (ouvert, répondu, bounce)
// Met à jour catalogue_distributeurs et ajoute une interaction
//
// Config dans Brevo : pointer le webhook vers
//   https://pro.maison-felicien.com/api/brevo-webhook
// Events à activer : opened, click, reply, hardBounce
//
// Protection : Brevo ne supporte pas de signature native, on peut protéger
// via un query param ?secret=... à configurer côté Brevo et dans l'env Vercel
// BREVO_WEBHOOK_SECRET.

const SUPABASE_URL = 'https://ckvwkwufdlydobjfwvwy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HICvkAoFNpeWenSsXT-FFQ_4O0IyS2l';

async function supaPatch(table, filter, payload) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(payload)
  });
  return r.ok;
}

async function supaInsert(table, payload) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(payload)
  });
  return r.ok;
}

async function supaGetDistribByEmail(email) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/catalogue_distributeurs?email=eq.${encodeURIComponent(email)}&select=id,pipeline_statut`, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`
    }
  });
  if (!r.ok) return null;
  const arr = await r.json();
  return arr[0] || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  // Shared secret via query param (Brevo ne gère pas HMAC natif)
  const expectedSecret = process.env.BREVO_WEBHOOK_SECRET;
  if (expectedSecret) {
    const got = req.query?.secret || '';
    if (got !== expectedSecret) return res.status(401).json({ error: 'Bad secret' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== 'object') return res.status(200).json({ ok: true });

  // Brevo event format : { event, email, ts, ... }
  const { event, email } = body;
  if (!email) return res.status(200).json({ ok: true });

  const distrib = await supaGetDistribByEmail(email);
  if (!distrib) return res.status(200).json({ ok: true, note: 'no matching distributeur' });

  const now = new Date().toISOString();

  if (event === 'opened' || event === 'open') {
    await supaPatch('catalogue_distributeurs', `id=eq.${distrib.id}`, { last_email_opened_at: now });
    await supaInsert('distributeur_interactions', {
      distributeur_id: distrib.id,
      type: 'email_ouvert',
      description: 'Email ouvert (webhook Brevo)',
      occurred_at: now,
      created_by: 'brevo-webhook'
    });
    return res.status(200).json({ ok: true });
  }

  if (event === 'answered' || event === 'reply' || event === 'replied') {
    // La transition vers 'reponse' se fait sauf si déjà plus avancé
    const advanced = ['degustation','rdv','devis','signe','actif'];
    const patch = { last_email_replied_at: now, date_dernier_contact: now };
    if (!advanced.includes(distrib.pipeline_statut)) patch.pipeline_statut = 'reponse';
    await supaPatch('catalogue_distributeurs', `id=eq.${distrib.id}`, patch);
    await supaInsert('distributeur_interactions', {
      distributeur_id: distrib.id,
      type: 'email_repondu',
      description: 'Email répondu (webhook Brevo)',
      occurred_at: now,
      created_by: 'brevo-webhook'
    });
    return res.status(200).json({ ok: true });
  }

  if (event === 'hardBounce' || event === 'hard_bounce') {
    await supaInsert('distributeur_interactions', {
      distributeur_id: distrib.id,
      type: 'note_libre',
      description: 'Hard bounce — email invalide',
      occurred_at: now,
      created_by: 'brevo-webhook'
    });
    return res.status(200).json({ ok: true });
  }

  if (event === 'click' || event === 'clicked') {
    await supaInsert('distributeur_interactions', {
      distributeur_id: distrib.id,
      type: 'email_ouvert',
      description: 'Clic dans email (Brevo)',
      occurred_at: now,
      created_by: 'brevo-webhook'
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true, note: 'event ignored', event });
}
