-- ============================================================
-- supabase/radar_metricas.sql — GN Studio OS v2.0
-- Fase 4: Tabla de métricas de lanzamientos desde el Radar
-- ============================================================

CREATE TABLE IF NOT EXISTS radar_metricas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma_id  text NOT NULL REFERENCES radar_plataformas(id) ON DELETE CASCADE,
  job_url        text NOT NULL,
  lanzado_en     timestamptz NOT NULL DEFAULT now()
);

-- Índice para consultas analíticas por plataforma y fecha
CREATE INDEX IF NOT EXISTS idx_radar_metricas_plataforma_fecha
  ON radar_metricas (plataforma_id, lanzado_en DESC);

-- Índice para conteo total de lanzamientos por URL
CREATE INDEX IF NOT EXISTS idx_radar_metricas_url
  ON radar_metricas (job_url);

-- Vista: resumen de lanzamientos por plataforma (últimos 30 días)
CREATE OR REPLACE VIEW radar_metricas_resumen AS
SELECT
  m.plataforma_id,
  p.nombre AS plataforma_nombre,
  COUNT(*)                                          AS total_lanzamientos,
  COUNT(*) FILTER (WHERE m.lanzado_en > now() - interval '7 days')  AS lanzamientos_7d,
  COUNT(*) FILTER (WHERE m.lanzado_en > now() - interval '30 days') AS lanzamientos_30d,
  MAX(m.lanzado_en)                                AS ultimo_lanzamiento
FROM radar_metricas m
JOIN radar_plataformas p ON p.id = m.plataforma_id
GROUP BY m.plataforma_id, p.nombre
ORDER BY total_lanzamientos DESC;

-- RLS: solo el owner autenticado puede leer métricas
ALTER TABLE radar_metricas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON radar_metricas
  FOR ALL USING (true)
  WITH CHECK (true);
