-- ============================================================
-- radar_schema_v2.sql — GN Studio OS
-- Fase 2: Constraint UNIQUE en radar_jobs.url para upsert
-- + índice de caché + columna logo en radar_plataformas
-- ============================================================

-- Agregar columna logo si no existe
ALTER TABLE radar_plataformas
  ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT '🔗';

-- Actualizar logos por plataforma
UPDATE radar_plataformas SET logo = '🟢' WHERE id = 'upwork';
UPDATE radar_plataformas SET logo = '🔵' WHERE id = 'workana';
UPDATE radar_plataformas SET logo = '🟠' WHERE id = 'fiverr';
UPDATE radar_plataformas SET logo = '🔷' WHERE id = 'linkedin';
UPDATE radar_plataformas SET logo = '⚡' WHERE id = 'freelancer';
UPDATE radar_plataformas SET logo = '🎨' WHERE id = 'behance';

-- Agregar UNIQUE constraint en url para permitir upsert
-- (ejecutar solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'radar_jobs_url_key'
  ) THEN
    ALTER TABLE radar_jobs ADD CONSTRAINT radar_jobs_url_key UNIQUE (url);
  END IF;
END;
$$;

-- Índice para caché: buscar jobs recientes por plataforma
CREATE INDEX IF NOT EXISTS idx_radar_jobs_plataforma_fecha
  ON radar_jobs (plataforma_id, fecha_publicacion DESC);

-- Columna actualizado_en con trigger de auto-update
ALTER TABLE radar_jobs
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_radar_jobs_actualizado ON radar_jobs;
CREATE TRIGGER trg_radar_jobs_actualizado
  BEFORE UPDATE ON radar_jobs
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- Limpiar jobs muy antiguos (más de 30 días) para no llenar la BD
CREATE OR REPLACE FUNCTION limpiar_radar_jobs_viejos()
RETURNS void AS $$
BEGIN
  DELETE FROM radar_jobs
  WHERE fecha_publicacion < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comentario de uso
COMMENT ON TABLE radar_jobs IS
  'Caché de jobs del Radar de Oportunidades. Se actualiza vía Edge Function radar-jobs con fuente RSS.';
