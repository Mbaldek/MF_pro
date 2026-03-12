-- Supabase Dashboard > SQL Editor > New query > Run
-- OU : supabase db push (si CLI configuré)

CREATE TABLE IF NOT EXISTS public.leads (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nom             TEXT NOT NULL,
  societe         TEXT,
  email           TEXT NOT NULL,
  telephone       TEXT NOT NULL,
  site_web        TEXT,
  nom_projet      TEXT,
  type_evenement  TEXT,
  date_evenement  TEXT,
  nb_personnes    TEXT,
  message         TEXT,
  source          TEXT DEFAULT 'pro-site',
  statut          TEXT DEFAULT 'nouveau'
);

CREATE INDEX IF NOT EXISTS idx_leads_statut   ON public.leads(statut);
CREATE INDEX IF NOT EXISTS idx_leads_created  ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email    ON public.leads(email);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Seule la service key peut lire/écrire (pas d'accès anon)
CREATE POLICY "service_role_only" ON public.leads
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.leads IS 'Leads entrants depuis pro.maison-felicien.com';
COMMENT ON COLUMN public.leads.statut IS 'nouveau | contacté | devis_envoyé | gagné | perdu';
