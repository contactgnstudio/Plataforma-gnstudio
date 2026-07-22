// ============================================================
// supabase/functions/radar-jobs/index.ts — GN Studio OS v2.0
// Edge Function: GET /radar-jobs
// Devuelve plataformas activas con jobs recientes (o mock).
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, apikey, Authorization',
};

serve(async (req: Request) => {
  // ── CORS preflight ──────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url    = new URL(req.url);
    const limit  = parseInt(url.searchParams.get('limit')  ?? '3');
    const platId = url.searchParams.get('plataforma') ?? null;
    const categ  = url.searchParams.get('categoria')  ?? null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── 1. Consultar plataformas activas ──────────────────
    let platQuery = supabase
      .from('radar_plataformas')
      .select('*')
      .eq('activo', true)
      .order('id');

    if (platId) platQuery = platQuery.eq('id', platId);
    if (categ)  platQuery = platQuery.eq('categoria', categ);

    const { data: plataformas, error: platError } = await platQuery;
    if (platError) throw platError;

    // ── 2. Para cada plataforma, obtener jobs recientes ───
    const result = await Promise.all(
      (plataformas ?? []).map(async (p: Record<string, unknown>) => {
        const { data: jobs } = await supabase
          .from('radar_jobs')
          .select('titulo, presupuesto, fecha_publicacion, url')
          .eq('plataforma_id', p.id)
          .order('fecha_publicacion', { ascending: false })
          .limit(limit);

        return {
          id:           p.id,
          nombre:       p.nombre,
          color:        p.color,
          color_bg:     p.color_bg,
          color_border: p.color_border,
          logo:         p.logo,
          descripcion:  p.descripcion,
          search_url:   p.search_url,
          categoria:    p.categoria,
          // Si no hay jobs en BD, devuelve array vacío
          // El frontend mostrará el botón "Ver trabajos en vivo" con search_url
          jobs: (jobs ?? []).map((j: Record<string, unknown>) => ({
            titulo:            j.titulo,
            presupuesto:       j.presupuesto ?? 'Negociable',
            fecha_publicacion: j.fecha_publicacion,
            url:               j.url,
          })),
        };
      })
    );

    return new Response(
      JSON.stringify({ plataformas: result }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
