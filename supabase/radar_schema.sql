-- ============================================================
-- supabase/radar_schema.sql — GN Studio OS v2.0
-- Tablas para el Radar de Oportunidades
-- ============================================================

-- ── Tabla: radar_plataformas ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.radar_plataformas (
  id           TEXT PRIMARY KEY,                    -- 'upwork', 'workana', etc.
  nombre       TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#ffffff',
  color_bg     TEXT NOT NULL DEFAULT 'rgba(255,255,255,0.05)',
  color_border TEXT NOT NULL DEFAULT 'rgba(255,255,255,0.15)',
  logo         TEXT,                                -- emoji o URL de icono
  descripcion  TEXT,
  search_url   TEXT,                                -- URL de búsqueda filtrada principal
  categoria    TEXT,                                -- 'branding', 'web', 'motion', etc.
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.radar_plataformas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública" ON public.radar_plataformas FOR SELECT USING (true);

-- ── Tabla: radar_jobs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.radar_jobs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id      TEXT NOT NULL REFERENCES public.radar_plataformas(id) ON DELETE CASCADE,
  titulo             TEXT NOT NULL,
  presupuesto        TEXT,                          -- '$300–$800', 'Negociable', etc.
  fecha_publicacion  TIMESTAMPTZ,
  url                TEXT,                          -- Link directo al job en la plataforma
  fuente             TEXT DEFAULT 'manual',         -- 'rss', 'api', 'manual'
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.radar_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública" ON public.radar_jobs FOR SELECT USING (true);

-- Índice principal para consultas por plataforma + fecha
CREATE INDEX IF NOT EXISTS idx_radar_jobs_plataforma_fecha
  ON public.radar_jobs (plataforma_id, fecha_publicacion DESC);

-- ── Seed: plataformas por defecto ────────────────────────────
INSERT INTO public.radar_plataformas (id, nombre, color, color_bg, color_border, logo, descripcion, search_url, categoria)
VALUES
  ('upwork',     'Upwork',         '#14a800', 'rgba(20,168,0,0.08)',    'rgba(20,168,0,0.25)',    '🟢', 'La plataforma freelance más grande del mundo',   'https://www.upwork.com/nx/search/jobs/?q=brand+design+identity&sort=recency',                    'branding'),
  ('workana',    'Workana',        '#0075FF', 'rgba(0,117,255,0.08)',   'rgba(0,117,255,0.25)',   '🔵', 'La plataforma líder en Latinoamérica',            'https://www.workana.com/jobs?category=design&subcategory=brand-design&language=es',              'branding'),
  ('fiverr',     'Fiverr',         '#1DBF73', 'rgba(29,191,115,0.08)',  'rgba(29,191,115,0.25)',  '🟠', 'Marketplace global con millones de compradores',  'https://www.fiverr.com/search/gigs?query=brand+identity+design&sort_by=rating',                 'branding'),
  ('linkedin',   'LinkedIn Jobs',  '#0077B5', 'rgba(0,119,181,0.08)',   'rgba(0,119,181,0.25)',   '🔷', 'Oportunidades con empresas y agencias',           'https://www.linkedin.com/jobs/search/?keywords=brand+designer&f_TPR=r86400&sortBy=DD',          'branding'),
  ('freelancer', 'Freelancer.com', '#29B2FE', 'rgba(41,178,254,0.08)',  'rgba(41,178,254,0.25)',  '⚡', 'Proyectos globales y concursos de diseño',        'https://www.freelancer.com/jobs/graphic-design/?q=branding+logo',                              'branding'),
  ('behance',    'Behance Jobs',   '#1769FF', 'rgba(23,105,255,0.08)',  'rgba(23,105,255,0.25)',  '🎨', 'Jobs en la comunidad creativa de Adobe',          'https://www.behance.net/joblist?tracking_source=nav20&field=132',                               'branding')
ON CONFLICT (id) DO NOTHING;
