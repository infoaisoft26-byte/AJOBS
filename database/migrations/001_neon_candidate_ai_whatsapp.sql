-- AIJOBS Neon additive application-data and integration schema.
-- Safe to re-run; does not drop or truncate any existing data.
CREATE TABLE IF NOT EXISTS candidate_profiles (
  user_id text PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  candidate_id text, phone text, city text, state text, headline text,
  preferred_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  education jsonb NOT NULL DEFAULT '[]'::jsonb,
  experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  resume_url text, profile_completion integer NOT NULL DEFAULT 0,
  profile_status text NOT NULL DEFAULT 'incomplete',
  whatsapp_opt_in boolean NOT NULL DEFAULT false,
  email_opt_in boolean NOT NULL DEFAULT false,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_consents (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  channel text NOT NULL, purpose text NOT NULL, granted boolean NOT NULL DEFAULT false,
  source text NOT NULL, policy_version text, recorded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, UNIQUE(user_id,channel,purpose)
);
CREATE TABLE IF NOT EXISTS activity_events (
  id text PRIMARY KEY, user_id text, role text, event_name text NOT NULL,
  source text NOT NULL DEFAULT 'web', occurred_at timestamptz NOT NULL DEFAULT now(),
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb, metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS ai_engine_runs (
  id text PRIMARY KEY, provider text NOT NULL, model text NOT NULL, task text NOT NULL,
  user_id text, job_id text, application_id text, status text NOT NULL,
  duration_ms integer, result jsonb NOT NULL DEFAULT '{}'::jsonb, error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id text PRIMARY KEY, phone text NOT NULL, name text, email text,
  lead_type text NOT NULL DEFAULT 'unclassified', business_name text, city text,
  opted_in boolean NOT NULL DEFAULT false, opted_out boolean NOT NULL DEFAULT false,
  consent_source text, last_message_at timestamptz, last_message_preview text, lead_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id text PRIMARY KEY, contact_id text NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  message_type text NOT NULL DEFAULT 'text', body text, meta_status text, phone_number_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
  id text PRIMARY KEY, event_type text NOT NULL, message_id text, event_status text,
  phone_number_id text, occurred_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS crm_leads (
  id text PRIMARY KEY, source text NOT NULL, source_ref text, lead_type text NOT NULL DEFAULT 'unclassified',
  name text, email text, phone text, company text, city text, status text NOT NULL DEFAULT 'New',
  assigned_to text, last_activity_at timestamptz, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_phone ON candidate_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_skills ON candidate_profiles USING gin(skills);
CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_user_time ON activity_events(user_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_name_time ON activity_events(event_name,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_engine_runs_application ON ai_engine_runs(application_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON whatsapp_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_lead_type ON whatsapp_contacts(lead_type,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_time ON whatsapp_messages(contact_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(meta_status,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_source_time ON crm_leads(source,created_at DESC);
